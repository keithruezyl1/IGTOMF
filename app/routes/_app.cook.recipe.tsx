import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { v4 as uuid } from "uuid";

import { RecipeView } from "~/components/RecipeView";
import { useToast } from "~/components/Toast";
import { generateRecipe } from "~/lib/ai.server";
import { addDish } from "~/lib/dishes.client";
import { consumeFlash, flash } from "~/lib/session.server";
import type { Dish, MealSuggestion } from "~/types";

type RecipeJob = {
  dishName: string;
  ingredients: string;
  imageUrl: string;
};

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const dishName = String(form.get("dishName") ?? "").trim();
  const ingredients = String(form.get("ingredients") ?? "").trim();
  const imageUrl = String(form.get("imageUrl") ?? "");
  if (!dishName || !ingredients) {
    return redirect("/");
  }
  const headers = await flash<RecipeJob>(request, "recipeJob", {
    dishName,
    ingredients,
    imageUrl,
  });
  return redirect("/cook/recipe", { headers });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { value: job, headers } = await consumeFlash<RecipeJob>(
    request,
    "recipeJob",
  );
  if (!job) throw redirect("/");
  const result = await generateRecipe(job.dishName, job.ingredients);
  if (result.kind === "error") {
    return json(
      { job, recipe: null, error: result.message } as const,
      { headers, status: 500 },
    );
  }
  return json(
    { job, recipe: result.recipe, error: null } as const,
    { headers },
  );
}

export default function CookRecipeRoute() {
  const { job, recipe, error } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { notify } = useToast();

  useEffect(() => {
    if (error) notify(error, "error");
  }, [error, notify]);

  if (!recipe) {
    return (
      <main className="max-w-3xl mx-auto px-4 md:px-8 pt-10 pb-24 text-center">
        <div className="card-base p-8">
          <h1 className="font-display font-bold text-2xl mb-2 text-ink">
            Recipe didn't come through.
          </h1>
          <p className="font-body text-sm text-muted mb-6">
            Hop back to the chat and we'll try again.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn-primary"
          >
            Back to the kitchen
          </button>
        </div>
      </main>
    );
  }

  const meal: MealSuggestion = {
    name: job.dishName,
    description: recipe.intro,
    likelihood: 90,
    why: recipe.intro,
    emoji: "🍽️",
    imageUrl: job.imageUrl || null,
  };

  function makingIt() {
    const dish: Dish = {
      id: uuid(),
      dishName: job.dishName,
      recipe: recipe!,
      originalIngredients: job.ingredients,
      mealImage: job.imageUrl || null,
      rating: 0,
      createdAt: new Date().toISOString(),
    };
    addDish(dish);
    notify(`Saved ${job.dishName}. Go cook, chef!`, "success");
    setTimeout(() => navigate("/profile"), 600);
  }

  function tryElse() {
    navigate("/");
  }

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <RecipeView
          meal={meal}
          recipe={recipe}
          onMakingIt={makingIt}
          onTryElse={tryElse}
        />
      </motion.div>
    </main>
  );
}
