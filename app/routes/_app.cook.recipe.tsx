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
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  commitSessionSafely,
  consumeFlash,
  getSession,
} from "~/lib/session.server";
import type { Dish, RecipeIngredient } from "~/types";

type RecipeJob = {
  dishName: string;
  ingredients: string;
  imageUrl: string;
  index: number;
  generationId: string;
};

type CachedEntry = {
  job: RecipeJob;
  title: RecipeTitle;
  ingredients: RecipeIngredients;
  steps: RecipeSteps;
  expiresAt: number;
};

// Recipes age out 30 minutes after generation. sessionStorage already clears
// on tab close; this TTL handles the "user keeps the tab open for hours" case.
const RECIPE_TTL_MS = 30 * 60 * 1000;

function sessionCacheKey(generationId: string, index: number): string {
  return `recipe_cache_${generationId}_${index}`;
}

function writeRecipeCache(
  generationId: string,
  index: number,
  entry: Omit<CachedEntry, "expiresAt">,
) {
  if (typeof window === "undefined" || !generationId) return;
  try {
    window.sessionStorage.setItem(
      sessionCacheKey(generationId, index),
      JSON.stringify({ ...entry, expiresAt: Date.now() + RECIPE_TTL_MS }),
    );
  } catch {
    // sessionStorage may be unavailable in private mode; safe to skip
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "view");

  if (intent === "refresh-steps") {
    const dishName = String(form.get("dishName") ?? "").trim();
    const userIngredients = String(form.get("ingredients") ?? "").trim();
    if (!dishName || !userIngredients) {
      return json({ error: "Missing context" }, { status: 400 });
    }
    // Parse the user's raw ingredients string into a minimal list. We avoid a
    // separate ingredients-regeneration call so this refresh stays a single
    // OpenAI request.
    const ingredientList: RecipeIngredient[] = userIngredients
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12)
      .map((name) => ({
        name,
        quantity: "",
        unit: "",
        isYouMightNeed: false,
      }));
    const steps = await generateRecipeSteps(dishName, ingredientList);
    return json(steps);
  }

  const dishName = String(form.get("dishName") ?? "").trim();
  const ingredients = String(form.get("ingredients") ?? "").trim();
  const imageUrl = String(form.get("imageUrl") ?? "");
  const indexRaw = form.get("index");
  const index = indexRaw !== null ? Number(indexRaw) : -1;
  const generationId = String(form.get("generationId") ?? "");
  if (!dishName || !ingredients) {
    return redirect("/");
  }

  // No cookState mutation here. The cookie is write-once on the cook action;
  // viewedIndices is derived client-side from sessionStorage so this action
  // can't tip the cookie over the 4KB limit.
  const session = await getSession(request);

  const job: RecipeJob = {
    dishName,
    ingredients,
    imageUrl,
    index,
    generationId,
  };
  session.flash("recipeJob", job);
  const cookie = await commitSessionSafely(session);
  // Put index + generationId in the URL so clientLoader can short-circuit to
  // sessionStorage with the correct key for this submission batch.
  const params = new URLSearchParams();
  if (Number.isInteger(index) && index >= 0) params.set("i", String(index));
  if (generationId) params.set("g", generationId);
  const target = `/cook/recipe${params.size ? `?${params}` : ""}`;
  return redirect(
    target,
    cookie ? { headers: { "Set-Cookie": cookie } } : undefined,
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  let job: RecipeJob | undefined;
  let headers: Headers;
  try {
    const flashed = await consumeFlash<RecipeJob>(request, "recipeJob");
    job = flashed.value;
    headers = flashed.headers;
  } catch (err) {
    console.error("recipe loader: consumeFlash failed", err);
    throw redirect("/");
  }
  if (!job) throw redirect("/");

  // Capture for narrowing inside the .then closures.
  const jobLocal = job;

  // Each generation step is wrapped so a rejection propagates to its <Await>
  // errorElement rather than throwing the whole loader.
  const titlePromise = generateRecipeTitle(
    jobLocal.dishName,
    jobLocal.ingredients,
  ).catch((err) => {
    console.error("title generation failed", err);
    throw err;
  });
  const ingredientsPromise = titlePromise.then((t) =>
    generateRecipeIngredients(
      t.title,
      jobLocal.dishName,
      jobLocal.ingredients,
    ).catch((err) => {
      console.error("ingredients generation failed", err);
      throw err;
    }),
  );
  const stepsPromise = Promise.all([titlePromise, ingredientsPromise]).then(
    ([t, ing]) =>
      generateRecipeSteps(t.title, ing.ingredients).catch((err) => {
        console.error("steps generation failed", err);
        throw err;
      }),
  );

  return defer(
    {
      job: jobLocal,
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

  // Stabilize the combined promise so React's Suspense reconciler doesn't see
  // a fresh Promise.all on every render (which can cause hydration mismatches).
  const allReadyPromise = useMemo(
    () => Promise.all([titlePromise, ingredientsPromise, stepsPromise]),
    [titlePromise, ingredientsPromise, stepsPromise],
  );

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
          <StepsSection
            stepsPromise={stepsPromise}
            dishName={job.dishName}
            userIngredients={job.ingredients}
          />
        </section>

        <Suspense fallback={null}>
          <Await
            resolve={allReadyPromise}
            errorElement={<span aria-hidden />}
          >
            {([t, ing, s]: [RecipeTitle, RecipeIngredients, RecipeSteps]) => (
              <RecipeFooter
                job={job}
                title={t}
                ingredients={ing}
                steps={s}
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
  job: RecipeJob;
  title: RecipeTitle;
  ingredients: RecipeIngredients;
  steps: RecipeSteps;
  onTryElse: () => void;
  onSaved: (name: string) => void;
}) {
  const navigate = useNavigate();
  const cacheWritten = useRef(false);

  // Persist the resolved recipe to sessionStorage so revisiting the same
  // suggestion in this tab skips regeneration. Idempotent for cache hits.
  useEffect(() => {
    if (cacheWritten.current) return;
    if (props.job.index < 0 || !props.job.generationId) return;
    cacheWritten.current = true;
    writeRecipeCache(props.job.generationId, props.job.index, {
      job: props.job,
      title: props.title,
      ingredients: props.ingredients,
      steps: props.steps,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function makingIt() {
    const ingredients: RecipeIngredient[] = props.ingredients.ingredients;
    const instructions: string[] = props.steps.instructions;
    const dish: Dish = {
      id: uuid(),
      dishName: props.title.title,
      recipe: {
        intro: props.title.intro,
        ingredients,
        instructions,
        celebration: props.steps.celebration,
      },
      originalIngredients: props.job.ingredients,
      mealImage: props.job.imageUrl || null,
      rating: 0,
      createdAt: new Date().toISOString(),
    };
    addDish(dish);
    props.onSaved(props.title.title);
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

function StepsList({ steps }: { steps: RecipeSteps }) {
  return (
    <>
      <ol className="flex flex-col gap-2.5">
        {steps.instructions.map((step, idx) => (
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
        {steps.celebration}
      </p>
    </>
  );
}

function StepsSection({
  stepsPromise,
  dishName,
  userIngredients,
}: {
  stepsPromise: Promise<RecipeSteps>;
  dishName: string;
  userIngredients: string;
}) {
  return (
    <Suspense fallback={<StepsSkeleton />}>
      <Await
        resolve={stepsPromise}
        errorElement={
          <StepsErrorBlock
            dishName={dishName}
            userIngredients={userIngredients}
          />
        }
      >
        {(s: RecipeSteps) => <StepsList steps={s} />}
      </Await>
    </Suspense>
  );
}

function StepsErrorBlock({
  dishName,
  userIngredients,
}: {
  dishName: string;
  userIngredients: string;
}) {
  const fetcher = useFetcher<RecipeSteps | { error: string }>();
  const [recovered, setRecovered] = useState<RecipeSteps | null>(null);

  useEffect(() => {
    if (fetcher.data && "instructions" in fetcher.data) {
      setRecovered(fetcher.data);
    }
  }, [fetcher.data]);

  function refresh() {
    const fd = new FormData();
    fd.set("intent", "refresh-steps");
    fd.set("dishName", dishName);
    fd.set("ingredients", userIngredients);
    fetcher.submit(fd, { method: "post", action: "/cook/recipe" });
  }

  if (recovered) {
    return <StepsList steps={recovered} />;
  }

  const loading = fetcher.state !== "idle";

  return (
    <div className="font-body text-sm text-coral border border-coral/30 bg-coral/5 rounded-xl p-3 flex items-center justify-between gap-3">
      <span>Steps didn't load. Try again?</span>
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        aria-label={loading ? "Refreshing steps" : "Refresh steps"}
        className="flex-shrink-0 w-8 h-8 rounded-full grid place-items-center text-coral hover:bg-coral/10 disabled:opacity-50 disabled:cursor-wait transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={loading ? "animate-spin" : ""}
          aria-hidden
        >
          {loading ? (
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          ) : (
            <>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
