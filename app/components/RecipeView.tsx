import { AnimatePresence, motion } from "motion/react";
import { TALKING } from "~/lib/mustafo";
import type { MealSuggestion, Recipe } from "~/types";

type Props = {
  meal: MealSuggestion;
  recipe: Recipe;
  onMakingIt: () => void;
  onTryElse: () => void;
};

export function RecipeView({ meal, recipe, onMakingIt, onTryElse }: Props) {
  const haveIt = recipe.ingredients.filter((i) => !i.isYouMightNeed);
  const youMight = recipe.ingredients.filter((i) => i.isYouMightNeed);

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={meal.name}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="card-base overflow-hidden"
      >
        <div className="relative h-48 md:h-64 bg-gradient-to-br from-fresh via-sunny to-coral overflow-hidden">
          {meal.imageUrl ? (
            <img
              src={meal.imageUrl}
              alt={meal.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-8xl drop-shadow-[0_6px_12px_rgba(0,0,0,0.25)]">
                {meal.emoji}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
          <h1 className="absolute bottom-4 left-5 right-5 font-display font-bold text-2xl md:text-4xl text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.5)]">
            {meal.name}
          </h1>
        </div>

        <div className="p-5 md:p-8 grid md:grid-cols-[1fr_1.4fr] gap-6 md:gap-8">
          {/* Left column: intro + ingredients */}
          <div>
            <div className="flex gap-3 mb-5">
              <img
                src={TALKING[2]}
                alt=""
                className="w-16 h-16 object-contain flex-shrink-0"
              />
              <p className="font-display text-sm md:text-base text-ink font-semibold leading-snug">
                {recipe.intro}
              </p>
            </div>

            <h2 className="font-display font-bold text-lg mb-3 text-ink">
              You'll need
            </h2>
            <ul className="flex flex-col gap-1.5 mb-6">
              {haveIt.map((i, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className="font-body text-sm text-ink flex items-baseline gap-2"
                >
                  <span className="text-fresh">•</span>
                  <span>
                    <strong className="font-semibold">
                      {i.quantity} {i.unit}
                    </strong>{" "}
                    {i.name}
                  </span>
                </motion.li>
              ))}
            </ul>

            {youMight.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-[16px] bg-peach/60 border-l-4 border-purple p-4"
              >
                <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2 mb-2">
                  <span aria-hidden>🛒</span> You might need
                </h3>
                <ul className="flex flex-col gap-1">
                  {youMight.map((i, idx) => (
                    <li
                      key={idx}
                      className="font-body italic text-sm text-ink/80"
                    >
                      {i.quantity ? `${i.quantity} ${i.unit} ` : ""}
                      {i.name}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>

          {/* Right column: steps */}
          <div>
            <h2 className="font-display font-bold text-lg mb-4 text-ink">
              The steps
            </h2>
            <ol className="flex flex-col gap-3">
              {recipe.instructions.map((step, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * idx, duration: 0.4 }}
                  className="flex gap-3 items-start"
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-fresh text-white font-display font-bold text-sm grid place-items-center shadow-button">
                    {idx + 1}
                  </span>
                  <p className="font-body text-sm md:text-[15px] text-ink leading-relaxed pt-0.5">
                    {step}
                  </p>
                </motion.li>
              ))}
            </ol>

            {recipe.celebration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6 rounded-[16px] bg-gradient-to-br from-sunny/30 to-fresh/20 p-4 border border-sunny/40"
              >
                <p className="font-display font-semibold text-sm text-ink">
                  {recipe.celebration}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        <div className="px-5 md:px-8 pb-6 md:pb-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
          <button type="button" onClick={onTryElse} className="btn-secondary">
            <span aria-hidden>👎</span>
            I Wanna Try Something Else
          </button>
          <button type="button" onClick={onMakingIt} className="btn-primary">
            <span aria-hidden>✅</span>
            I'm Making This
          </button>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
