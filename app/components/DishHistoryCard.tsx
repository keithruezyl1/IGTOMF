import { Link } from "@remix-run/react";
import { motion } from "motion/react";
import { StarRating } from "./StarRating";
import type { Dish } from "~/types";

type Props = {
  dish: Dish;
  onRate: (rating: number) => void;
  to: string;
};

function emojiFor(name: string) {
  const n = name.toLowerCase();
  if (/(pasta|spaghetti|noodle|carbonara)/.test(n)) return "🍝";
  if (/(chicken|wing|drum)/.test(n)) return "🍗";
  if (/(fish|salmon|tuna|shrimp|seafood)/.test(n)) return "🐟";
  if (/(salad|veggie|vegetable|greens)/.test(n)) return "🥗";
  if (/(rice|risotto|fried rice|jollof)/.test(n)) return "🍚";
  if (/(soup|stew|chowder)/.test(n)) return "🍲";
  if (/(burger)/.test(n)) return "🍔";
  if (/(taco|burrito|wrap)/.test(n)) return "🌮";
  if (/(pizza|flatbread)/.test(n)) return "🍕";
  if (/(curry|tikka)/.test(n)) return "🥘";
  if (/(bread|sandwich|toast)/.test(n)) return "🥪";
  if (/(cake|dessert|pie)/.test(n)) return "🍰";
  if (/(egg|omelet|frittata)/.test(n)) return "🍳";
  return "🍽️";
}

export function DishHistoryCard({ dish, onRate, to }: Props) {
  const emoji = emojiFor(dish.dishName);
  const date = new Date(dish.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.div layout whileHover={{ y: -4 }}>
      <Link
        to={to}
        prefetch="intent"
        className="card-base p-4 flex gap-4 group block"
      >
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-[14px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-fresh/30 to-sunny/30 grid place-items-center relative">
          {dish.mealImage ? (
            <img
              src={dish.mealImage}
              alt={dish.dishName}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl">{emoji}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-ink leading-tight group-hover:text-fresh transition-colors line-clamp-2">
              {dish.dishName}
            </h3>
            <p className="font-body text-xs text-muted mt-1">{date}</p>
          </div>
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="mt-2"
          >
            <StarRating value={dish.rating} onChange={onRate} size={18} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
