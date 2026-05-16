import {
  defer,
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Await,
  useFetcher,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { Suspense, useEffect, useRef } from "react";
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
  cacheRecipe,
  consumeFlash,
  decodeCookState,
  encodeCookState,
  getSession,
  storage,
  type CachedRecipe,
} from "~/lib/session.server";
import type { Dish, RecipeIngredient } from "~/types";

type RecipeJob = {
  dishName: string;
  ingredients: string;
  imageUrl: string;
  index: number;
};

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "select");

  if (intent === "cache") {
    return handleCacheWrite(request, form);
  }

  // Default: user picked a meal card.
  const dishName = String(form.get("dishName") ?? "").trim();
  const ingredients = String(form.get("ingredients") ?? "").trim();
  const imageUrl = String(form.get("imageUrl") ?? "");
  const indexRaw = form.get("index");
  const index = indexRaw !== null ? Number(indexRaw) : -1;
  if (!dishName || !ingredients) {
    return redirect("/");
  }

  const session = await getSession(request);
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

  // Flash only the small request payload. The loader resolves the cache hit
  // from cookState directly so we don't duplicate the recipe in the cookie
  // (which can overflow the 4KB browser limit).
  const job: RecipeJob = { dishName, ingredients, imageUrl, index };
  session.flash("recipeJob", job);
  const cookie = await storage.commitSession(session);
  return redirect("/cook/recipe", {
    headers: { "Set-Cookie": cookie },
  });
}

async function handleCacheWrite(request: Request, form: FormData) {
  const indexRaw = form.get("index");
  const index = indexRaw !== null ? Number(indexRaw) : -1;
  if (!Number.isInteger(index) || index < 0) {
    return json({ ok: false, error: "bad index" }, { status: 400 });
  }

  let ingredients: RecipeIngredient[] = [];
  let instructions: string[] = [];
  try {
    ingredients = JSON.parse(String(form.get("ingredients") ?? "[]"));
    instructions = JSON.parse(String(form.get("instructions") ?? "[]"));
  } catch {
    return json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const recipe: CachedRecipe = {
    title: String(form.get("title") ?? ""),
    intro: String(form.get("intro") ?? ""),
    ingredients,
    instructions,
    celebration: String(form.get("celebration") ?? ""),
  };

  const session = await getSession(request);
  const encoded = session.get("cookState") as string | undefined;
  const state = encoded ? decodeCookState(encoded) : null;
  if (!state) return json({ ok: true }); // nothing to update

  session.set("cookState", encodeCookState(cacheRecipe(state, index, recipe)));
  const cookie = await storage.commitSession(session);
  return json({ ok: true }, { headers: { "Set-Cookie": cookie } });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { value: job, headers } = await consumeFlash<RecipeJob>(
    request,
    "recipeJob",
  );
  if (!job) throw redirect("/");

  // Resolve cache from cookState (the flash itself doesn't carry the recipe).
  const session = await getSession(request);
  const encoded = session.get("cookState") as string | undefined;
  const state = encoded ? decodeCookState(encoded) : null;
  const cached =
    state && Number.isInteger(job.index) && job.index >= 0
      ? state.recipes[String(job.index)] ?? null
      : null;

  if (cached) {
    return defer(
      {
        job,
        wasCached: true as const,
        titlePromise: Promise.resolve<RecipeTitle>({
          title: cached.title,
          intro: cached.intro,
        }),
        ingredientsPromise: Promise.resolve<RecipeIngredients>({
          ingredients: cached.ingredients,
        }),
        stepsPromise: Promise.resolve<RecipeSteps>({
          instructions: cached.instructions,
          celebration: cached.celebration,
        }),
      },
      { headers },
    );
  }

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
      wasCached: false as const,
      titlePromise,
      ingredientsPromise,
      stepsPromise,
    },
    { headers },
  );
}

export default function CookRecipeRoute() {
  const { job, wasCached, titlePromise, ingredientsPromise, stepsPromise } =
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
                index={job.index}
                wasCached={wasCached}
                dishTitle={t.title}
                intro={t.intro}
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
  index: number;
  wasCached: boolean;
  dishTitle: string;
  intro: string;
  ingredients: RecipeIngredients["ingredients"];
  instructions: string[];
  celebration: string;
  imageUrl: string;
  originalIngredients: string;
  onTryElse: () => void;
  onSaved: (name: string) => void;
}) {
  const navigate = useNavigate();
  const cacheFetcher = useFetcher();
  const cacheWritten = useRef(false);

  // First-generation cache write-back. Skip if this view was already served
  // from cache (wasCached) or if we've already written for this mount.
  useEffect(() => {
    if (props.wasCached || cacheWritten.current) return;
    if (props.index < 0) return;
    cacheWritten.current = true;
    const fd = new FormData();
    fd.set("intent", "cache");
    fd.set("index", String(props.index));
    fd.set("title", props.dishTitle);
    fd.set("intro", props.intro);
    fd.set("celebration", props.celebration);
    fd.set("ingredients", JSON.stringify(props.ingredients));
    fd.set("instructions", JSON.stringify(props.instructions));
    cacheFetcher.submit(fd, { method: "post", action: "/cook/recipe" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
