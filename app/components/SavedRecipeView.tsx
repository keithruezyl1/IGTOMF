import { Link } from "@remix-run/react";
import { StarRating } from "./StarRating";
import type { Dish } from "~/types";

type Props = {
  dish: Dish;
  onRate: (rating: number) => void;
};

export function SavedRecipeView({ dish, onRate }: Props) {
  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 pt-6 pb-24">
      <Link
        to="/profile"
        className="font-display font-semibold text-sm text-muted hover:text-ink inline-flex items-center gap-1 mb-4"
      >
        <span aria-hidden>←</span> Back to profile
      </Link>

      <article className="card-base p-6 md:p-8 space-y-6">
        {dish.mealImage && (
          <img
            src={dish.mealImage}
            alt={dish.dishName}
            className="w-full h-48 md:h-64 object-cover rounded-[16px]"
          />
        )}
        <header>
          <h1 className="font-display font-bold text-3xl md:text-4xl text-ink leading-tight">
            {dish.dishName}
          </h1>
          <p className="font-body text-sm text-muted italic mt-2">
            Originally from: "{dish.originalIngredients}"
          </p>
        </header>

        <div>
          <StarRating value={dish.rating} onChange={onRate} size={24} />
        </div>

        <section>
          <h2 className="font-display font-bold text-lg mb-2 text-ink">
            Ingredients
          </h2>
          <ul className="flex flex-col gap-1">
            {dish.recipe.ingredients.map((i, idx) => (
              <li key={idx} className="font-body text-sm text-ink">
                <span className={i.isYouMightNeed ? "italic text-muted" : ""}>
                  {i.quantity} {i.unit} {i.name}
                  {i.isYouMightNeed && " (might need)"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg mb-2 text-ink">
            Steps
          </h2>
          <ol className="flex flex-col gap-2.5">
            {dish.recipe.instructions.map((s, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-fresh text-white font-display font-bold text-xs grid place-items-center">
                  {idx + 1}
                </span>
                <p className="font-body text-sm text-ink leading-relaxed pt-0.5">
                  {s}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </main>
  );
}
