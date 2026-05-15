import { motion } from "motion/react";
import type { MealSuggestion } from "~/types";

type Props = {
  meal: MealSuggestion;
  onSelect: () => void;
  index: number;
};

function fallbackGradient(emoji: string) {
  const map: Record<string, string> = {
    "🍝": "from-fresh to-sunny",
    "🍗": "from-sunny to-coral",
    "🐟": "from-sky to-mint",
    "🥗": "from-mint to-purple",
    "🍚": "from-sunny to-mint",
    "🍞": "from-peach to-sunny",
    "🍔": "from-coral to-sunny",
    "🌮": "from-coral to-purple",
    "🥘": "from-coral to-sunny",
    "🍲": "from-sunny to-fresh",
    "🍰": "from-peach to-purple",
  };
  return map[emoji] ?? "from-mint to-sunny";
}

export function MealSuggestionCard({ meal, onSelect, index }: Props) {
  const likelihood = Math.max(0, Math.min(100, Math.round(meal.likelihood)));

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="group text-left card-base overflow-hidden flex flex-col w-full focus:outline-none"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 220, damping: 22 }}
      whileHover={{ scale: 1.03, boxShadow: "0 12px 32px rgba(0,0,0,0.12)" }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={`relative h-44 md:h-48 bg-gradient-to-br ${fallbackGradient(
          meal.emoji,
        )} overflow-hidden`}
      >
        {meal.imageUrl ? (
          <img
            src={meal.imageUrl}
            alt={meal.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <motion.span
              className="text-7xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.18)]"
              animate={{ rotate: [0, -6, 6, 0], y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
            >
              {meal.emoji}
            </motion.span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute top-3 left-3 chip bg-white/90 text-ink">
          <span aria-hidden>{meal.emoji}</span>
          <span>Meal {index + 1}</span>
        </span>
      </div>

      <div className="p-5 flex flex-col gap-3">
        <h3 className="font-display font-bold text-lg leading-tight text-ink group-hover:text-fresh transition-colors">
          {meal.name}
        </h3>
        <p className="font-body text-sm text-muted leading-snug line-clamp-3">
          {meal.why}
        </p>

        <div className="mt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-body text-xs font-semibold text-muted uppercase tracking-wider">
              Likelihood
            </span>
            <span className="font-display font-bold text-sm text-ink">
              {likelihood}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-soft overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${likelihood}%` }}
              transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
              className="h-full rounded-full bg-gradient-to-r from-fresh via-mint to-sunny"
            />
          </div>
        </div>

        <span className="font-display font-semibold text-sm text-fresh inline-flex items-center gap-1.5 mt-1 group-hover:gap-2.5 transition-all">
          Show me how
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7"/>
          </svg>
        </span>
      </div>
    </motion.button>
  );
}
