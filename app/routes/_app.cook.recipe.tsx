import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

import { useToast } from "~/components/Toast";
import {
  generateFullRecipe,
  type FullRecipe,
  type RecipeIngredients,
  type RecipeSteps,
  type RecipeTitle,
} from "~/lib/ai.server";
import { addDish, markRecipeViewed } from "~/lib/dishes.client";
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

function readRecipeCache(
  generationId: string,
  index: number,
): CachedEntry | null {
  if (typeof window === "undefined" || !generationId) return null;
  try {
    const key = sessionCacheKey(generationId, index);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    if (
      typeof entry.expiresAt !== "number" ||
      entry.expiresAt < Date.now()
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
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

  if (intent === "regenerate") {
    // Fallback path: client landed on /cook/recipe without a cached recipe
    // in sessionStorage (new tab, stale URL, etc). Generate one fresh.
    const dishName = String(form.get("dishName") ?? "").trim();
    const userIngredients = String(form.get("ingredients") ?? "").trim();
    if (!dishName || !userIngredients) {
      return json({ error: "Missing context" }, { status: 400 });
    }
    const full = await generateFullRecipe(dishName, userIngredients);
    return json(full);
  }

  // Default path: user picked a meal card. Stash the job in flash and
  // redirect to the recipe page with index + generationId in the URL.
  const dishName = String(form.get("dishName") ?? "").trim();
  const ingredients = String(form.get("ingredients") ?? "").trim();
  const imageUrl = String(form.get("imageUrl") ?? "");
  const indexRaw = form.get("index");
  const index = indexRaw !== null ? Number(indexRaw) : -1;
  const generationId = String(form.get("generationId") ?? "");
  if (!dishName || !ingredients) {
    return redirect("/");
  }

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
  // The page renders entirely from sessionStorage now. The loader's only job
  // is to read the recipeJob from flash so the component knows what to look
  // up (and to redirect if someone hits this URL directly).
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
  return json({ job }, { headers });
}

export default function CookRecipeRoute() {
  const { job } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const fetcher = useFetcher<FullRecipe | { error: string }>();

  // `entry` mirrors the cached recipe for this view. We seed it from
  // sessionStorage on mount; if missing, we trigger a regenerate fetcher.
  const [entry, setEntry] = useState<CachedEntry | null | undefined>(undefined);

  useEffect(() => {
    // Mark this recipe as viewed regardless of cache-hit vs regenerate path
    // — the user landed on the page, that's what "viewed" means.
    markRecipeViewed(job.generationId, job.index);

    const cached = readRecipeCache(job.generationId, job.index);
    if (cached) {
      setEntry(cached);
      return;
    }
    // Cache miss (new tab, stale URL, expired). Auto-trigger regeneration.
    const fd = new FormData();
    fd.set("intent", "regenerate");
    fd.set("dishName", job.dishName);
    fd.set("ingredients", job.ingredients);
    fetcher.submit(fd, { method: "post", action: "/cook/recipe" });
    setEntry(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.generationId, job.index]);

  // When the regenerate fetcher returns a FullRecipe, write it to
  // sessionStorage and rebuild the cached entry locally so we render it.
  useEffect(() => {
    if (!fetcher.data) return;
    if ("error" in fetcher.data) return;
    if (job.index < 0 || !job.generationId) return;
    writeRecipeCache(job.generationId, job.index, {
      job,
      title: fetcher.data.title,
      ingredients: fetcher.data.ingredients,
      steps: fetcher.data.steps,
    });
    setEntry({
      job,
      title: fetcher.data.title,
      ingredients: fetcher.data.ingredients,
      steps: fetcher.data.steps,
      expiresAt: Date.now() + RECIPE_TTL_MS,
    });
  }, [fetcher.data, job]);

  function tryElse() {
    navigate("/");
  }

  // entry === undefined: initial mount, haven't checked sessionStorage yet
  // entry === null: cache miss, regenerate in flight
  // entry === CachedEntry: we have content to render

  if (entry === undefined) {
    return <RecipeLoadingState />;
  }

  if (entry === null) {
    const failed =
      fetcher.state === "idle" && fetcher.data && "error" in fetcher.data;
    if (failed) {
      return <RecipeFailedState onRetry={() => navigate("/")} />;
    }
    return <RecipeLoadingState />;
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

        <header>
          <h1 className="font-display font-bold text-3xl md:text-4xl text-ink leading-tight">
            {entry.title.title}
          </h1>
          <p className="font-body text-muted mt-2">{entry.title.intro}</p>
        </header>

        <section>
          <h2 className="font-display font-bold text-lg mb-3 text-ink">
            Ingredients
          </h2>
          <ul className="flex flex-col gap-1">
            {entry.ingredients.ingredients.map((i, idx) => (
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
          <h2 className="font-display font-bold text-lg mb-3 text-ink">
            Steps
          </h2>
          <ol className="flex flex-col gap-2.5">
            {entry.steps.instructions.map((step, idx) => (
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
            {entry.steps.celebration}
          </p>
        </section>

        <RecipeFooter
          job={job}
          title={entry.title}
          ingredients={entry.ingredients}
          steps={entry.steps}
          onTryElse={tryElse}
          onSaved={(name) =>
            notify(`Saved ${name}. Go cook, chef!`, "success")
          }
        />
      </article>
    </main>
  );
}

function RecipeLoadingState() {
  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 pt-6 pb-24">
      <article className="card-base p-6 md:p-8 space-y-6 animate-pulse">
        <div className="w-full h-48 md:h-64 bg-soft rounded-[16px]" />
        <div className="space-y-3">
          <div className="h-10 bg-soft rounded w-2/3" />
          <div className="h-4 bg-soft rounded w-5/6" />
        </div>
        <div className="space-y-2">
          <div className="h-5 bg-soft rounded w-1/3 mb-3" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-4 bg-soft rounded"
              style={{ width: `${70 + (i % 3) * 10}%` }}
            />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-5 bg-soft rounded w-1/4 mb-3" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-soft flex-shrink-0" />
              <div
                className="flex-1 h-4 bg-soft rounded"
                style={{ width: `${75 + (i % 4) * 5}%` }}
              />
            </div>
          ))}
        </div>
      </article>
    </main>
  );
}

function RecipeFailedState({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 pt-10 pb-24 text-center">
      <div className="card-base p-8">
        <h1 className="font-display font-bold text-2xl mb-2 text-ink">
          Recipe didn't come through.
        </h1>
        <p className="font-body text-sm text-muted mb-6">
          Head back to the kitchen and pick again.
        </p>
        <button type="button" onClick={onRetry} className="btn-primary">
          Back to suggestions
        </button>
      </div>
    </main>
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
