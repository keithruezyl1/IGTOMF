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
import {
  generateMealSuggestions,
  type SuggestionsResult,
} from "~/lib/ai.server";
import {
  COOK_GREETING_LINES,
  COOK_GREETING_SUBLINES,
  EXPRESSIONS,
  LOADING_MESSAGES,
  SUGGESTIONS_HEADERS,
  SUGGESTIONS_SUBHEADERS,
  TALKING,
} from "~/lib/mustafo";
import {
  commitSessionSafely,
  decodeCookState,
  encodeCookState,
  getSession,
} from "~/lib/session.server";
import type { UserProfile } from "~/types";
import { useAppContext } from "./_app";

const RECIPE_LOADING = [
  "Pulling together the recipe...",
  "Measuring with vibes only...",
  "Adding the secret step...",
  "Almost there, chef...",
] as const;

function pickCopyIndices() {
  return {
    greetingIdx: Math.floor(Math.random() * COOK_GREETING_LINES.length),
    sublineIdx: Math.floor(Math.random() * COOK_GREETING_SUBLINES.length),
    suggestionsHeaderIdx: Math.floor(
      Math.random() * SUGGESTIONS_HEADERS.length,
    ),
    suggestionsSubheaderIdx: Math.floor(
      Math.random() * SUGGESTIONS_SUBHEADERS.length,
    ),
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const encoded = session.get("cookState") as string | undefined;
  const state = encoded ? decodeCookState(encoded) : null;
  const copy = pickCopyIndices();

  return json({
    suggestions: state?.suggestions ?? null,
    submittedIngredients: state?.submittedIngredients ?? "",
    copy,
  });
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
  const session = await getSession(request);
  session.set(
    "cookState",
    encodeCookState({
      suggestions: result.suggestions,
      submittedIngredients: ingredients,
    }),
  );
  const cookie = await commitSessionSafely(session);
  return redirect("/", cookie ? { headers: { "Set-Cookie": cookie } } : undefined);
}

type Stage = "chat" | "suggestions";

function CookInner({ profile }: { profile: UserProfile }) {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const suggestions = loaderData.suggestions;
  const submittedIngredients = loaderData.submittedIngredients;

  const [ingredients, setIngredients] = useState(submittedIngredients);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [viewedIndices, setViewedIndices] = useState<number[]>([]);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIngredients(submittedIngredients);
  }, [submittedIngredients]);

  // Derive viewedIndices client-side: a suggestion is "viewed" if its recipe
  // is cached in sessionStorage. This used to live in cookState but was
  // growing the cookie past the 4KB limit on each click.
  useEffect(() => {
    if (typeof window === "undefined" || !suggestions) return;
    const indices: number[] = [];
    for (let i = 0; i < suggestions.length; i++) {
      if (window.sessionStorage.getItem(`recipe_cache_${i}`)) {
        indices.push(i);
      }
    }
    setViewedIndices(indices);
  }, [suggestions]);

  const isSubmittingPost =
    navigation.state === "submitting" && navigation.formMethod === "POST";
  const submittingDishName = navigation.formData?.get("dishName");
  const isSuggesting = isSubmittingPost && !submittingDishName;
  const isFetchingRecipe = isSubmittingPost && !!submittingDishName;

  const stage: Stage = suggestions && suggestions.length > 0 ? "suggestions" : "chat";

  const errorMessage = actionData && "error" in actionData ? actionData.error : null;

  useEffect(() => {
    if (actionData) setErrorDismissed(false);
  }, [actionData]);

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
                {COOK_GREETING_LINES[loaderData.copy.greetingIdx].prefix.replace(
                  "{name}",
                  profile.username.split(" ")[0],
                )}{" "}
                <span className="text-fresh">
                  {COOK_GREETING_LINES[loaderData.copy.greetingIdx].highlight}
                </span>
              </h1>
              <p className="font-body text-sm md:text-base text-muted leading-relaxed mt-1.5 max-w-lg">
                {COOK_GREETING_SUBLINES[loaderData.copy.sublineIdx]}
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
              className={`btn-primary ${isSuggesting ? "!bg-[#16A34A] !cursor-wait" : ""}`}
              aria-busy={isSuggesting}
            >
              {isSuggesting ? (
                <>
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Finding you something...
                </>
              ) : (
                <>
                  Find me something
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </Form>

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
                      "Don't overthink it. Type whatever's in there.",
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
                    {SUGGESTIONS_HEADERS[loaderData.copy.suggestionsHeaderIdx]}
                  </h2>
                  <p className="font-body text-muted max-w-md text-sm">
                    {
                      SUGGESTIONS_SUBHEADERS[
                        loaderData.copy.suggestionsSubheaderIdx
                      ]
                    }
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {suggestions.map((m, i) => (
                    <MealSuggestionCard
                      key={m.name + i}
                      meal={m}
                      index={i}
                      submittedIngredients={submittedIngredients}
                      viewed={viewedIndices.includes(i)}
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

      <NoFoodModal
        open={!!errorMessage && !errorDismissed}
        message={errorMessage ?? ""}
        onClose={() => setErrorDismissed(true)}
      />
    </>
  );
}

function NoFoodModal({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-black/35 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="no-food-title"
        >
          <motion.div
            className="relative bg-white rounded-[28px] shadow-modal w-full max-w-md p-7 md:p-9 text-center"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.img
              src={EXPRESSIONS[5]}
              alt="Mustafo sarcastic"
              className="w-28 h-28 md:w-32 md:h-32 mx-auto mb-4 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
              initial={{ y: -20, rotate: -8, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
            />
            <h2
              id="no-food-title"
              className="font-display font-bold text-2xl md:text-3xl text-ink mb-2 leading-tight"
            >
              That's not food, chef.
            </h2>
            <p className="font-body text-sm md:text-base text-muted leading-relaxed mb-6">
              {message}
            </p>
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="btn-primary w-full"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function CookRoute() {
  const { profile } = useAppContext();
  return <CookInner profile={profile} />;
}
