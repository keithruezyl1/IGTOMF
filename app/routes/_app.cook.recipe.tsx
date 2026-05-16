import {
  defer,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Await, useLoaderData, useNavigate } from "@remix-run/react";
import { Suspense } from "react";
import { v4 as uuid } from "uuid";

import {
  IngredientsSkeleton,
  StepsSkeleton,
  TitleSkeleton,
} from "~/components/RecipeSkeleton";
import { useToast } from "~/components/Toast";
import {
  generateRecipeIngredients,
  generateRecipeSteps,
  generateRecipeTitle,
  type RecipeIngredients,
  type RecipeSteps,
  type RecipeTitle,
} from "~/lib/ai.server";
import { addDish } from "~/lib/dishes.client";
import {
  consumeFlash,
  decodeCookState,
  encodeCookState,
  getSession,
  storage,
} from "~/lib/session.server";
import type { Dish } from "~/types";

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
  const indexRaw = form.get("index");
  const index = indexRaw !== null ? Number(indexRaw) : -1;
  if (!dishName || !ingredients) {
    return redirect("/");
  }

  const session = await getSession(request);

  // Mark this suggestion as viewed so coming back via "Try something else"
  // shows the remaining cards.
  const encoded = session.get("cookState") as string | undefined;
  const state = encoded ? decodeCookState(encoded) : null;
  if (
    state &&
    Number.isInteger(index) &&
    index >= 0 &&
    !state.viewedIndices.includes(index)
  ) {
    session.set(
      "cookState",
      encodeCookState({
        ...state,
        viewedIndices: [...state.viewedIndices, index],
      }),
    );
  }

  session.flash("recipeJob", { dishName, ingredients, imageUrl } as RecipeJob);
  const cookie = await storage.commitSession(session);
  return redirect("/cook/recipe", {
    headers: { "Set-Cookie": cookie },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { value: job, headers } = await consumeFlash<RecipeJob>(
    request,
    "recipeJob",
  );
  if (!job) throw redirect("/");

  const titlePromise = generateRecipeTitle(job.dishName, job.ingredients);
  const ingredientsPromise = titlePromise.then((t) =>
    generateRecipeIngredients(t.title, job.dishName, job.ingredients),
  );
  const stepsPromise = Promise.all([titlePromise, ingredientsPromise]).then(
    ([t, ing]) => generateRecipeSteps(t.title, ing.ingredients),
  );

  return defer(
    {
      job,
      titlePromise,
      ingredientsPromise,
      stepsPromise,
    },
    { headers },
  );
}

export default function CookRecipeRoute() {
  const { job, titlePromise, ingredientsPromise, stepsPromise } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { notify } = useToast();

  function tryElse() {
    navigate("/");
  }

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 pt-6 pb-24">
      <article className="card-base p-6 md:p-8 space-y-6">
        {job.imageUrl && (
          <img
            src={job.imageUrl}
            alt={job.dishName}
            className="w-full h-48 md:h-64 object-cover rounded-[16px]"
          />
        )}

        <Suspense fallback={<TitleSkeleton />}>
          <Await
            resolve={titlePromise}
            errorElement={
              <ErrorBlock message="Couldn't dream up a title. Try again?" />
            }
          >
            {(t: RecipeTitle) => (
              <header>
                <h1 className="font-display font-bold text-3xl md:text-4xl text-ink leading-tight">
                  {t.title}
                </h1>
                <p className="font-body text-muted mt-2">{t.intro}</p>
              </header>
            )}
          </Await>
        </Suspense>

        <section>
          <h2 className="font-display font-bold text-lg mb-3 text-ink">
            Ingredients
          </h2>
          <Suspense fallback={<IngredientsSkeleton />}>
            <Await
              resolve={ingredientsPromise}
              errorElement={
                <ErrorBlock message="Ingredients didn't load. Refresh?" />
              }
            >
              {(ing: RecipeIngredients) => (
                <ul className="flex flex-col gap-1">
                  {ing.ingredients.map((i, idx) => (
                    <li key={idx} className="font-body text-sm text-ink">
                      <span
                        className={i.isYouMightNeed ? "italic text-muted" : ""}
                      >
                        {i.quantity} {i.unit} {i.name}
                        {i.isYouMightNeed && " (might need)"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Await>
          </Suspense>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg mb-3 text-ink">
            Steps
          </h2>
          <Suspense fallback={<StepsSkeleton />}>
            <Await
              resolve={stepsPromise}
              errorElement={
                <ErrorBlock message="Steps didn't load. Try again?" />
              }
            >
              {(s: RecipeSteps) => (
                <>
                  <ol className="flex flex-col gap-2.5">
                    {s.instructions.map((step, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-fresh text-white font-display font-bold text-xs grid place-items-center">
                          {idx + 1}
                        </span>
                        <p className="font-body text-sm text-ink leading-relaxed pt-0.5">
                          {step}
                        </p>
                      </li>
                    ))}
                  </ol>
                  <p className="font-body text-sm text-ink italic mt-6">
                    {s.celebration}
                  </p>
                </>
              )}
            </Await>
          </Suspense>
        </section>

        <Suspense fallback={null}>
          <Await
            resolve={Promise.all([
              titlePromise,
              ingredientsPromise,
              stepsPromise,
            ])}
          >
            {([t, ing, s]: [RecipeTitle, RecipeIngredients, RecipeSteps]) => (
              <RecipeFooter
                dishTitle={t.title}
                ingredients={ing.ingredients}
                instructions={s.instructions}
                celebration={s.celebration}
                imageUrl={job.imageUrl}
                originalIngredients={job.ingredients}
                onTryElse={tryElse}
                onSaved={(name) =>
                  notify(`Saved ${name}. Go cook, chef!`, "success")
                }
              />
            )}
          </Await>
        </Suspense>
      </article>
    </main>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="font-body text-sm text-coral border border-coral/30 bg-coral/5 rounded-xl p-3">
      {message}
    </div>
  );
}

function RecipeFooter(props: {
  dishTitle: string;
  ingredients: RecipeIngredients["ingredients"];
  instructions: string[];
  celebration: string;
  imageUrl: string;
  originalIngredients: string;
  onTryElse: () => void;
  onSaved: (name: string) => void;
}) {
  const navigate = useNavigate();
  function makingIt() {
    const dish: Dish = {
      id: uuid(),
      dishName: props.dishTitle,
      recipe: {
        intro: "",
        ingredients: props.ingredients,
        instructions: props.instructions,
        celebration: props.celebration,
      },
      originalIngredients: props.originalIngredients,
      mealImage: props.imageUrl || null,
      rating: 0,
      createdAt: new Date().toISOString(),
    };
    addDish(dish);
    props.onSaved(props.dishTitle);
    setTimeout(() => navigate("/profile"), 600);
  }
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
      <button
        type="button"
        onClick={props.onTryElse}
        className="btn-ghost flex-1"
      >
        Try something else
      </button>
      <button type="button" onClick={makingIt} className="btn-primary flex-1">
        I'm making it
      </button>
    </div>
  );
}
