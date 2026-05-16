import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { LoadingOverlay } from "~/components/LoadingOverlay";
import { MealSuggestionCard } from "~/components/MealSuggestionCard";
import { MustafoBubble } from "~/components/MustafoBubble";
import { useToast } from "~/components/Toast";
import {
  generateMealSuggestions,
  type SuggestionsResult,
} from "~/lib/ai.server";
import { LOADING_MESSAGES, TALKING } from "~/lib/mustafo";
import { consumeFlash, flash } from "~/lib/session.server";
import type { MealSuggestion, UserProfile } from "~/types";
import { useAppContext } from "./_app";

const RECIPE_LOADING = [
  "Pulling together the recipe...",
  "Measuring with vibes only...",
  "Adding the secret step...",
  "Almost there, chef...",
] as const;

type CookData = {
  suggestions: MealSuggestion[];
  submittedIngredients: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { value, headers } = await consumeFlash<CookData>(request, "cookData");
  return json(
    {
      suggestions: value?.suggestions ?? null,
      submittedIngredients: value?.submittedIngredients ?? "",
    },
    { headers },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const ingredients = String(form.get("ingredients") ?? "").trim();
  if (!ingredients) {
    return json({ error: "Tell me what's in there." }, { status: 400 });
  }
  const result: SuggestionsResult = await generateMealSuggestions(ingredients);
  if (result.kind === "no-food") {
    return json({ error: result.message }, { status: 400 });
  }
  if (result.kind === "error") {
    return json({ error: result.message }, { status: 500 });
  }
  const headers = await flash<CookData>(request, "cookData", {
    suggestions: result.suggestions,
    submittedIngredients: ingredients,
  });
  return redirect("/", { headers });
}

type Stage = "chat" | "suggestions";

function CookInner({ profile }: { profile: UserProfile }) {
  const { notify } = useToast();
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const suggestions = loaderData.suggestions;
  const submittedIngredients = loaderData.submittedIngredients;

  const [ingredients, setIngredients] = useState("");
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const isSuggesting =
    navigation.state === "submitting" &&
    navigation.formMethod === "POST" &&
    navigation.formAction === "/";
  const isFetchingRecipe =
    navigation.state === "submitting" &&
    navigation.formAction === "/cook/recipe";

  const stage: Stage = suggestions && suggestions.length > 0 ? "suggestions" : "chat";

  const errorMessage = actionData && "error" in actionData ? actionData.error : null;

  useEffect(() => {
    if (errorMessage) notify(errorMessage, "error");
  }, [errorMessage, notify]);

  useEffect(() => {
    if (stage === "suggestions") {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    }
  }, [stage]);

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-24">
        {/* Greeting */}
        <section className="mb-6 md:mb-10">
          <div className="flex items-start gap-4 md:gap-6">
            <motion.img
              src={TALKING[0]}
              alt="Mustafo"
              className="w-20 h-20 md:w-28 md:h-28 object-contain flex-shrink-0 drop-shadow-[0_6px_18px_rgba(0,0,0,0.15)]"
              initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            />
            <div className="pt-2">
              <h1 className="font-display font-bold text-2xl md:text-4xl text-ink leading-tight">
                Hey {profile.username.split(" ")[0]} —{" "}
                <span className="text-fresh">what's in there?</span>
              </h1>
              <p className="font-body text-sm md:text-base text-muted leading-relaxed mt-1.5 max-w-lg">
                Drop everything you've got. Expired stuff is fine — I'll skip what's
                cursed.
              </p>
            </div>
          </div>
        </section>

        {/* Ingredient form */}
        <Form
          method="post"
          className="card-base p-5 md:p-6 relative overflow-hidden"
        >
          <span className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-sunny/20 blur-2xl" />
          <span className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-fresh/15 blur-2xl" />

          <label className="font-body font-semibold text-sm text-ink block mb-2 relative z-10">
            I got this in my fridge:
          </label>
          <textarea
            name="ingredients"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="chicken breast, garlic, pasta, half an onion, some questionable leftovers..."
            rows={3}
            className="input-base resize-y min-h-[100px] relative z-10"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 relative z-10">
            <span className="font-body text-xs text-muted">
              <kbd className="font-display px-1.5 py-0.5 rounded bg-soft text-ink text-[10px]">
                Enter
              </kbd>{" "}
              to send · <kbd className="font-display px-1.5 py-0.5 rounded bg-soft text-ink text-[10px]">Shift</kbd> + <kbd className="font-display px-1.5 py-0.5 rounded bg-soft text-ink text-[10px]">Enter</kbd> for new line
            </span>
            <button
              type="submit"
              disabled={!ingredients.trim() || isSuggesting}
              className="btn-primary"
            >
              Find me something
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </button>
          </div>
        </Form>

        {errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-coral text-sm font-body text-center"
          >
            {errorMessage}
          </motion.p>
        )}

        {/* Results area */}
        <div ref={resultsRef} className="mt-10 md:mt-14">
          <AnimatePresence mode="wait">
            {stage === "chat" && !isSuggesting && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <div className="flex justify-center">
                  <MustafoBubble
                    messages={[
                      "Don't overthink it — type whatever's in there.",
                      "Spoiled stuff? I'll roast it lovingly.",
                      "Even random snacks count.",
                      "Trust me on this one.",
                    ]}
                  />
                </div>
              </motion.div>
            )}

            {stage === "suggestions" && suggestions && (
              <motion.div
                key="suggestions"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <h2 className="font-display font-bold text-2xl md:text-3xl text-ink">
                    Here's what's calling your name
                  </h2>
                  <p className="font-body text-muted max-w-md text-sm">
                    Pick one and I'll walk you through it. Or scroll up and edit
                    your fridge.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {suggestions.map((m, i) => (
                    <MealSuggestionCard
                      key={m.name + i}
                      meal={m}
                      index={i}
                      submittedIngredients={submittedIngredients}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <LoadingOverlay
        open={isSuggesting || isFetchingRecipe}
        messages={isFetchingRecipe ? RECIPE_LOADING : LOADING_MESSAGES}
      />
    </>
  );
}

export default function CookRoute() {
  const { profile } = useAppContext();
  return <CookInner profile={profile} />;
}
