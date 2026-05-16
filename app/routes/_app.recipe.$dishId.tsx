import { Link, useParams } from "@remix-run/react";
import { useEffect, useState } from "react";

import { SavedRecipeView } from "~/components/SavedRecipeView";
import { useToast } from "~/components/Toast";
import { getDishes, updateDishRating } from "~/lib/dishes.client";
import type { Dish } from "~/types";

export default function SavedRecipeRoute() {
  const { dishId } = useParams();
  const { notify } = useToast();
  const [dish, setDish] = useState<Dish | null | undefined>(undefined);

  useEffect(() => {
    if (!dishId) {
      setDish(null);
      return;
    }
    const found = getDishes().find((d) => d.id === dishId);
    setDish(found ?? null);
  }, [dishId]);

  function handleRate(rating: number) {
    if (!dish) return;
    updateDishRating(dish.id, rating);
    setDish({ ...dish, rating });
    if (rating === 5) notify("Yasss 5 stars!", "success");
  }

  if (dish === undefined) {
    return (
      <main className="max-w-3xl mx-auto px-4 md:px-8 pt-10 pb-24">
        <div className="card-base p-8 animate-pulse">
          <div className="h-48 bg-soft rounded-[16px] mb-6" />
          <div className="h-8 bg-soft rounded w-2/3 mb-3" />
          <div className="h-4 bg-soft rounded w-1/2 mb-6" />
          <div className="space-y-2">
            <div className="h-4 bg-soft rounded" />
            <div className="h-4 bg-soft rounded w-5/6" />
            <div className="h-4 bg-soft rounded w-4/6" />
          </div>
        </div>
      </main>
    );
  }

  if (dish === null) {
    return (
      <main className="max-w-3xl mx-auto px-4 md:px-8 pt-10 pb-24 text-center">
        <div className="card-base p-8">
          <h1 className="font-display font-bold text-2xl mb-2 text-ink">
            Can't find that dish.
          </h1>
          <p className="font-body text-sm text-muted mb-6">
            Maybe it lives on another device, or maybe it got deleted.
          </p>
          <Link to="/profile" className="btn-primary inline-flex">
            Back to your dishes
          </Link>
        </div>
      </main>
    );
  }

  return <SavedRecipeView dish={dish} onRate={handleRate} />;
}
