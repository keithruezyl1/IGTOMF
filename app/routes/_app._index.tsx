import { useNavigate } from "@remix-run/react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { v4 as uuid } from "uuid";

import { LoadingOverlay } from "~/components/LoadingOverlay";
import { MealSuggestionCard } from "~/components/MealSuggestionCard";
import { MustafoBubble } from "~/components/MustafoBubble";
import { RecipeView } from "~/components/RecipeView";
import { useToast } from "~/components/Toast";
import { addDish } from "~/lib/dishes.client";
import { LOADING_MESSAGES, TALKING } from "~/lib/mustafo";
import type { Dish, MealSuggestion, Recipe, UserProfile } from "~/types";
import { useAppContext } from "./_app";

const RECIPE_LOADING = [
  "Pulling together the recipe...",
  "Measuring with vibes only...",
  "Adding the secret step...",
  "Almost there, chef...",
] as const;

type Stage = "chat" | "suggestions" | "recipe";

function CookInner({ profile }: { profile: UserProfile }) {
  const { notify } = useToast();
  const [ingredients, setIngredients] = useState("");
  const [submittedIngredients, setSubmittedIngredients] = useState("");
  const [stage, setStage] = useState<Stage>("chat");
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealSuggestion | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadingMode, setLoadingMode] = useState<"none" | "meals" | "recipe">(
    "none",
  );
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const value = ingredients.trim();
    if (!value || loadingMode !== "none") return;
    setError(null);
    setSubmittedIngredients(value);
    setLoadingMode("meals");
    try {
      const res = await fetch("/api/suggest-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: value }),
      });
      const data = (await res.json()) as
        | { suggestions: MealSuggestion[] }
        | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Something went sideways.");
      }
      setSuggestions(data.suggestions);
      setStage("suggestions");
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Mustafo's WiFi died. Try again in a sec?";
      setError(msg);
      notify(msg, "error");
    } finally {
      setLoadingMode("none");
    }
  }

  async function pickMeal(meal: MealSuggestion) {
    if (loadingMode !== "none") return;
    setError(null);
    setSelectedMeal(meal);
    setLoadingMode("recipe");
    try {
      const res = await fetch("/api/get-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishName: meal.name,
          ingredients: submittedIngredients,
        }),
      });
      const data = (await res.json()) as
        | { recipe: Recipe }
        | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Recipe didn't load.");
      }
      setRecipe(data.recipe);
      setStage("recipe");
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Recipe didn't come through.";
      setError(msg);
      notify(msg, "error");
    } finally {
      setLoadingMode("none");
    }
  }

  function makingIt() {
    if (!selectedMeal || !recipe) return;
    const dish: Dish = {
      id: uuid(),
      dishName: selectedMeal.name,
      recipe,
      originalIngredients: submittedIngredients,
      mealImage: selectedMeal.imageUrl ?? null,
      rating: 0,
      createdAt: new Date().toISOString(),
    };
    addDish(dish);
    notify(`Saved ${selectedMeal.name}. Go cook, chef!`, "success");
    setTimeout(() => {
      window.location.href = "/profile";
    }, 700);
  }

  function tryElse() {
    setRecipe(null);
    setSelectedMeal(null);
    setStage("suggestions");
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

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
        <form
          onSubmit={handleSubmit}
          className="card-base p-5 md:p-6 relative overflow-hidden"
        >
          <span className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-sunny/20 blur-2xl" />
          <span className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-fresh/15 blur-2xl" />

          <label className="font-body font-semibold text-sm text-ink block mb-2 relative z-10">
            I got this in my fridge:
          </label>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="chicken breast, garlic, pasta, half an onion, some questionable leftovers..."
            rows={3}
            className="input-base resize-y min-h-[100px] relative z-10"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
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
              disabled={!ingredients.trim() || loadingMode !== "none"}
              className="btn-primary"
            >
              Find me something
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </button>
          </div>
        </form>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-coral text-sm font-body text-center"
          >
            {error}
          </motion.p>
        )}

        {/* Results area */}
        <div ref={resultsRef} className="mt-10 md:mt-14">
          <AnimatePresence mode="wait">
            {stage === "chat" && loadingMode === "none" && (
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

            {stage === "suggestions" && (
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
                      onSelect={() => pickMeal(m)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {stage === "recipe" && selectedMeal && recipe && (
              <motion.div
                key="recipe"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <RecipeView
                  meal={selectedMeal}
                  recipe={recipe}
                  onMakingIt={makingIt}
                  onTryElse={tryElse}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <LoadingOverlay
        open={loadingMode !== "none"}
        messages={loadingMode === "recipe" ? RECIPE_LOADING : LOADING_MESSAGES}
      />
    </>
  );
}

export default function CookRoute() {
  const { profile } = useAppContext();
  return <CookInner profile={profile} />;
}
