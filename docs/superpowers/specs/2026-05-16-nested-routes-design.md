# Remix-native refactor — server-driven state, nested routes, streaming

**Date:** 2026-05-16
**Status:** Approved (pending written-spec review)

## Goal

Push the app from "Remix-as-bundler" toward "Remix-as-framework" — loaders own
the data, actions own the mutations, nested routes own the layout, and
`defer()` streams the slow part. Without breaking anything.

This supersedes the original narrower nested-routes-only design.

## The five changes, in build order

1. **Profile to a signed cookie session.** Loaders read profile server-side.
   No client-side `useEffect` flicker on gated pages. SSR ships HTML that
   already has the user.
2. **Nested routes via a pathless `_app` parent.** Cook + Profile share
   `ToastProvider` + `NavBar` + the profile gate. Onboarding stays standalone.
3. **`<Form method="post">` driving the cook flow.** Cook state (chat → suggestions
   → recipe) becomes URL state, not React state. Refresh-survivable.
4. **`useNavigation` for pending UI.** Replaces the local `loadingMode` state.
5. **`defer()` streaming the recipe.** Title appears at ~600ms, ingredients at
   ~1.8s, steps at ~3.8s — instead of a 4s blank loader.

These compose. The order is also the dependency order: (1) and (2) are the
foundation; (3) needs (1) so actions can read the profile; (5) only kicks in
for Remix-managed submissions, which is (3).

## Constraint: dishes can't go in a cookie

Browsers cap cookies at ~4KB. A saved dish is 1–3KB. After 2–4 dishes the
cookie overflows. Profile fits comfortably (~200B).

**Decision: hybrid storage.** Profile in a signed cookie, dishes stay in
`localStorage`. Cook page and NavBar get instant SSR. Profile page does one
brief client-load for the dishes grid (same pattern as today, scoped to one
page).

## Constraint: recipe URLs are non-deterministic

LLM-generated, so the same URL can't reliably return the same recipe.

**Decision: split routes.** `/cook/recipe` for the just-generated, transient,
session-backed recipe (refresh-survivable within one flow). `/recipe/:dishId`
for re-reading a saved dish from localStorage (shareable on the same device).

## Constraint: serverless deploy (Vercel)

`@vercel/remix` is the deploy target. No shared in-process memory between
requests. Rules out any "stash a Promise in a Map" pattern. Generation has to
be re-derivable from request data (URL params or session state).

## Deploy target & versions (confirmed from package.json)

- `@remix-run/node` 2.13.1 — `defer`, `Await`, `useNavigation`, cookie
  sessions all available.
- `@vercel/remix` 2.16.7 — streams flush correctly on Vercel.
- `openai` 4.67.3 — streaming + structured output both available.
- React 18.3.1 — Suspense + `<Await>` work.

No new runtime dependencies needed. One new env var: `SESSION_SECRET`.

---

## PR1 — Cookie sessions + nested routes

### New file: `app/lib/session.server.ts`

```ts
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import type { UserProfile } from "~/types";

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("SESSION_SECRET is not set");

const storage = createCookieSessionStorage<{ profile: UserProfile }>({
  cookie: {
    name: "igtimf_session",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secrets: [secret],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  },
});

export async function getSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getProfile(request: Request): Promise<UserProfile | null> {
  const session = await getSession(request);
  return session.get("profile") ?? null;
}

export async function requireProfile(
  request: Request,
  redirectTo = "/onboarding",
): Promise<UserProfile> {
  const profile = await getProfile(request);
  if (!profile) throw redirect(redirectTo);
  return profile;
}

export async function setProfile(request: Request, profile: UserProfile) {
  const session = await getSession(request);
  session.set("profile", profile);
  return storage.commitSession(session);
}

export async function clearProfile(request: Request) {
  const session = await getSession(request);
  return storage.destroySession(session);
}
```

Also exports two flash helpers built on `session.flash()` / `session.get()`,
used in PR2 to hand suggestions/recipe data between action and loader:

```ts
// Sets a flash value; returns Set-Cookie headers for the response.
export async function flash<T>(
  request: Request,
  key: string,
  value: T,
): Promise<Headers>;

// Reads + clears a flash value; returns the value and Set-Cookie headers
// for the loader's response so the cleared session persists.
export async function consumeFlash<T>(
  request: Request,
  key: string,
): Promise<{ value: T | undefined; headers: Headers }>;
```

The signature is single-key with a struct value — callers wanting multiple
fields pass a struct (e.g. `flash(request, "cookData", { suggestions, submittedIngredients })`).

### Route tree (final, all PRs)

```
app/routes/
├── _app.tsx                          (NEW pathless layout)
│   ├── _app._index.tsx               (cook — was _index.tsx)
│   ├── _app.cook.recipe.tsx          (NEW — in-flow recipe, PR2/PR3)
│   ├── _app.profile.tsx              (was profile.tsx)
│   └── _app.recipe.$dishId.tsx      (NEW — saved recipe view, PR1)
├── onboarding.tsx                    (loader: redirect if profile exists)
└── api.search-image.ts               (kept — used inside meal suggestions)
```

Deleted in later PRs: `api.suggest-meals.ts`, `api.get-recipe.ts` (PR2 moves
their logic into actions).

`_app` is Remix flat-routes syntax for a **pathless parent** — it groups
children without adding a URL segment. So `_app._index.tsx` matches `/`,
`_app.profile.tsx` matches `/profile`, `_app.cook.recipe.tsx` matches
`/cook/recipe`, `_app.recipe.$dishId.tsx` matches `/recipe/:dishId`.

### `app/routes/_app.tsx`

```tsx
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData, useOutletContext } from "@remix-run/react";
import { NavBar } from "~/components/NavBar";
import { ToastProvider } from "~/components/Toast";
import { requireProfile } from "~/lib/session.server";
import type { UserProfile } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const profile = await requireProfile(request);
  return json({ profile });
}

type AppContext = { profile: UserProfile };

export default function AppLayout() {
  const { profile } = useLoaderData<typeof loader>();
  return (
    <ToastProvider>
      <NavBar username={profile.username} profileImage={profile.profileImage} />
      <Outlet context={{ profile } satisfies AppContext} />
    </ToastProvider>
  );
}

export function useAppContext() {
  return useOutletContext<AppContext>();
}
```

No skeleton needed — profile is available before first render.

### Onboarding changes

[`onboarding.tsx`](../../../app/routes/onboarding.tsx) gets a loader:

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const profile = await getProfile(request);
  if (profile) throw redirect("/");
  return null;
}
```

Onboarding's final-step submit becomes a `<Form method="post">`. The action
calls `setProfile()` and returns a redirect to `/` with the
`Set-Cookie` header.

Drop the `useEffect(() => { if (getProfile()) navigate("/") })` block — the
loader handles it server-side now.

### Migration shim (one-time)

Existing users have `profile` in localStorage under key `igotthis_profile`.
Onboarding's loader can't see localStorage. Solution:

A small client-only `useEffect` in `onboarding.tsx` (the only public page that
runs before a cookie exists):

```tsx
useEffect(() => {
  const raw = localStorage.getItem("igotthis_profile");
  if (!raw) return;
  const form = new FormData();
  form.set("intent", "migrate");
  form.set("profile", raw);
  fetch("/onboarding", { method: "POST", body: form }).then(() => {
    localStorage.removeItem("igotthis_profile");
    window.location.replace("/");
  });
}, []);
```

The onboarding action handles `intent=migrate` by parsing the JSON, calling
`setProfile()`, returning a 200 (the client redirects after the fetch
resolves). Single-shot — once the localStorage key is gone, the effect
no-ops.

Old dishes (`igotthis_dishes`) stay in localStorage unchanged.

### Cook page (`_app._index.tsx`)

Wrapper component (lines 298–318 of current `_index.tsx`) deleted. The default
export becomes:

```tsx
import { useAppContext } from "./_app";
// CookInner stays in this file unchanged for PR1.
export default function CookRoute() {
  const { profile } = useAppContext();
  return <CookInner profile={profile} />;
}
```

The `<NavBar>` element inside `CookInner` (line 139) and the `ToastProvider`
import are removed — the parent owns them.

### Profile page (`_app.profile.tsx`)

Wrapper component (lines 290–311 of current `profile.tsx`) deleted. The default
export becomes:

```tsx
export default function ProfileRoute() {
  const { profile } = useAppContext();
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  useEffect(() => setDishes(getDishes()), []);
  if (!dishes) return null;
  return <ProfileInner profile={profile} initialDishes={dishes} />;
}
```

`<NavBar>` (line 59) and `ToastProvider` import removed.

The dish modal in `ProfileInner` (lines 197–260) gets replaced by a
`<Link to={\`/recipe/${dish.id}\`}>` on each `DishHistoryCard`. The modal JSX
and `openDish` state go away. The delete-account confirmation modal stays.

### New page: `_app.recipe.$dishId.tsx`

Reads `params.dishId` and renders the dish from localStorage. Because dishes
are client-only, this page renders a skeleton first and populates in
`useEffect`. Renders 404-style "dish not found" if the id doesn't match.

```tsx
export default function SavedRecipeRoute() {
  const { dishId } = useParams();
  const [dish, setDish] = useState<Dish | null | undefined>(undefined);
  useEffect(() => {
    const found = getDishes().find((d) => d.id === dishId);
    setDish(found ?? null);
  }, [dishId]);
  if (dish === undefined) return <RecipeSkeleton />;
  if (dish === null) return <NotFound />;
  return <SavedRecipeView dish={dish} />;
}
```

`SavedRecipeView` reuses the markup currently inside the dish modal
(ingredients list + steps list + cover image + star rating + "originally
from" line). The rating handler calls `updateDishRating()` and `setDish()`.

### Storage module split

[`app/lib/storage.ts`](../../../app/lib/storage.ts) is mixed-purpose. Split:

- **Remove** `getProfile`, `setProfile`, `clearAll`'s profile clearing — replaced by `session.server.ts`.
- **Keep** `getDishes`, `setDishes`, `addDish`, `updateDishRating`, plus a new `clearDishes()`. Rename file to `app/lib/dishes.client.ts` so the `.client.ts` suffix excludes it from server bundles (Remix convention).
- The "delete account" button in profile calls a new `/onboarding?intent=logout` action (clears the cookie + redirects to `/onboarding`) AND clears dishes client-side before navigating.

### PR1 acceptance criteria

1. `GET /` with a valid session cookie renders the cook page with NavBar
   populated server-side. No `mounted` flag, no `useEffect`-then-redirect.
2. `GET /` with no cookie returns a 302 to `/onboarding`.
3. `GET /onboarding` with a valid session cookie returns a 302 to `/`.
4. New users complete onboarding, get a `Set-Cookie` in the response, are
   redirected to `/`, and the cook page renders without a second page load.
5. Existing users with `igotthis_profile` in localStorage hit `/onboarding`
   once, the migration effect POSTs, the cookie is set, localStorage is
   cleared, and they're redirected to `/` — silent and one-shot.
6. `GET /profile` renders the dishes grid; the dish "view" interaction now
   navigates to `/recipe/:dishId` instead of opening a modal.
7. `GET /recipe/:dishId` for a saved dish renders the recipe; for an unknown
   id renders a not-found state.
8. NavBar and ToastProvider each appear in exactly one place
   (`_app.tsx`).
9. `requireProfile()` is the single source of the auth gate.
10. `npm run typecheck` and `npm run build` succeed.
11. The cook flow itself (form submit → suggestions → recipe → save) still
    works exactly as today.

---

## PR2 — Form-driven cook flow + `useNavigation`

### Cook page becomes a form

`_app._index.tsx` gets a `loader` and an `action`:

```ts
type CookData = { suggestions: MealSuggestion[]; submittedIngredients: string };

export async function loader({ request }: LoaderFunctionArgs) {
  const { value, headers } = await consumeFlash<CookData>(request, "cookData");
  return json(
    {
      suggestions: value?.suggestions ?? null,
      submittedIngredients: value?.submittedIngredients ?? null,
    },
    { headers },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const ingredients = String(form.get("ingredients") ?? "").trim();
  if (!ingredients) return json({ error: "Tell me what's in there." }, 400);
  const suggestions = await generateMealSuggestions(ingredients);
  const headers = await flash<CookData>(request, "cookData", {
    suggestions,
    submittedIngredients: ingredients,
  });
  return redirect("/", { headers });
}
```

`generateMealSuggestions()` is the logic currently in
[`api.suggest-meals.ts`](../../../app/routes/api.suggest-meals.ts), extracted
into `app/lib/ai.server.ts`. The route file gets deleted.

The form in `CookInner` swaps from `onSubmit={handleSubmit}` to
`<Form method="post">`. The `ingredients` state remains for the textarea,
but the POST happens through Remix.

### Pick-meal becomes a form submission

The meal-suggestion card's `onSelect` becomes a `<Form>`:

```tsx
<Form method="post" action="/cook/recipe">
  <input type="hidden" name="dishName" value={meal.name} />
  <input type="hidden" name="ingredients" value={submittedIngredients} />
  <input type="hidden" name="imageUrl" value={meal.imageUrl ?? ""} />
  <button type="submit">{meal.name}</button>
</Form>
```

`submittedIngredients` is read from the loader (also flashed in). No
React-state `setSubmittedIngredients`.

### `_app.cook.recipe.tsx`

```ts
export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const dishName = String(form.get("dishName") ?? "");
  const ingredients = String(form.get("ingredients") ?? "");
  const imageUrl = String(form.get("imageUrl") ?? "");
  if (!dishName || !ingredients) return redirect("/");
  // stash params; loader will regenerate (serverless-safe)
  const headers = await flash(request, "recipeJob", {
    dishName, ingredients, imageUrl,
  });
  return redirect("/cook/recipe", { headers });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { value: job, headers } = await consumeFlash<RecipeJob>(request, "recipeJob");
  if (!job) throw redirect("/");
  // PR2: synchronous — full recipe in loader data.
  const recipe = await generateRecipe(job.dishName, job.ingredients);
  return json({ job, recipe }, { headers });
  // PR3 replaces this with defer().
}
```

The "I'm making it" button on the recipe page is a `<button onClick>` that:
1. Calls `addDish()` client-side (writes to localStorage).
2. Calls `navigate("/profile")`.

Not a `<Form>` — the dish persistence is client-only. Confirmed
acceptable in the design conversation.

### `useNavigation` replaces `loadingMode`

In `CookInner`:

```tsx
const navigation = useNavigation();
const isSuggesting =
  navigation.state === "submitting" &&
  navigation.formMethod === "POST" &&
  navigation.formAction === "/";
const isFetchingRecipe =
  navigation.state === "submitting" &&
  navigation.formAction === "/cook/recipe";
```

`LoadingOverlay` consumes `isSuggesting || isFetchingRecipe`. The local
`loadingMode` state is deleted. So is the `error` state — errors come from
the action's returned `actionData`:

```tsx
const actionData = useActionData<typeof action>();
// actionData?.error renders the inline error message
```

The `stage` state machine (`"chat" | "suggestions" | "recipe"`) is deleted.
Stage is now URL-derived: at `/` with no `suggestions` in loader data →
chat; with suggestions → suggestions; at `/cook/recipe` → recipe.

### PR2 acceptance criteria

1. Submitting the ingredients form does a real POST → 302 → reload pattern.
   Works with JS disabled (renders meal suggestions on the next page load).
2. Picking a meal POSTs to `/cook/recipe` and lands on the recipe page with
   the generated recipe in loader data.
3. Refreshing `/cook/recipe` after a recipe is shown either re-shows it from
   flash (if not yet consumed) or redirects to `/` (if flash already
   consumed) — both are acceptable. (Note: flash is single-read; if we want
   refresh-survivable, switch from flash to a non-flashed session key cleared
   on `back` to `/`.)
4. `useNavigation()` drives `LoadingOverlay`. No `loadingMode` state remains
   in `CookInner`.
5. The state-machine `stage` variable is deleted. Stage is URL-derived.
6. Error messages from actions surface via `useActionData` and render
   inline + via toast.
7. `api.suggest-meals.ts` and `api.get-recipe.ts` route files are deleted;
   their logic lives in `app/lib/ai.server.ts`.
8. "I'm making it" still saves the dish to localStorage and navigates to
   `/profile`.
9. `npm run typecheck`, `npm run build` succeed.

---

## PR3 — `defer()` streaming for the recipe

### Three sequential structured-output calls

Instead of one `getRecipe()` call that returns the full recipe JSON, split:

```ts
// ai.server.ts
export async function getRecipeTitle(dishName: string, ingredients: string) {
  // small structured output: { title, blurb }
}
export async function getRecipeIngredients(
  title: string, dishName: string, ingredients: string,
) {
  // structured output: { ingredients: Ingredient[] }
}
export async function getRecipeSteps(
  title: string, ingredientList: Ingredient[], ingredients: string,
) {
  // structured output: { instructions: string[] }
}
```

Each call sees the prior step's output so the model stays consistent (steps
reference ingredients by name, etc.).

### Loader returns `defer()`

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  const { value: job, headers } = await consumeFlash<RecipeJob>(request, "recipeJob");
  if (!job) throw redirect("/");

  const titlePromise = getRecipeTitle(job.dishName, job.ingredients);
  const ingredientsPromise = titlePromise.then((t) =>
    getRecipeIngredients(t.title, job.dishName, job.ingredients),
  );
  const stepsPromise = Promise.all([titlePromise, ingredientsPromise]).then(
    ([t, ing]) => getRecipeSteps(t.title, ing.ingredients, job.ingredients),
  );

  return defer(
    { job, titlePromise, ingredientsPromise, stepsPromise },
    { headers },
  );
}
```

### Recipe component renders three `<Await>` blocks

```tsx
const { job, titlePromise, ingredientsPromise, stepsPromise } =
  useLoaderData<typeof loader>();

return (
  <>
    <Suspense fallback={<TitleSkeleton />}>
      <Await resolve={titlePromise}>{(t) => <RecipeHeader title={t.title} blurb={t.blurb} />}</Await>
    </Suspense>

    <Suspense fallback={<IngredientsSkeleton />}>
      <Await resolve={ingredientsPromise}>{(ing) => <IngredientsList items={ing.ingredients} />}</Await>
    </Suspense>

    <Suspense fallback={<StepsSkeleton />}>
      <Await resolve={stepsPromise}>{(s) => <StepsList items={s.instructions} />}</Await>
    </Suspense>

    {/* Footer with "Making it" and "Try something else" — depends only on title */}
    <Suspense fallback={null}>
      <Await resolve={titlePromise}>
        {(t) => <RecipeFooter dishName={t.title} {...job} />}
      </Await>
    </Suspense>
  </>
);
```

The `LoadingOverlay` between `/` and `/cook/recipe` (driven by
`useNavigation` in PR2) dismisses as soon as the recipe page starts streaming
— title is the first thing to land. Replaces the existing 4-second blocking
spinner with a progressive reveal.

### PR3 acceptance criteria

1. Navigating to `/cook/recipe` results in the title rendering within ~1s of
   navigation start.
2. Ingredients render below the title without re-layout shift, replacing the
   ingredients skeleton.
3. Steps render last, replacing the steps skeleton.
4. The "Making it" button is reachable as soon as the title has resolved
   (button doesn't wait for steps).
5. If the OpenAI API fails on any of the three calls, the corresponding
   `<Await>` shows an error fallback (use `errorElement` prop on `<Await>`).
6. `useNavigation` still indicates pending between `/` and `/cook/recipe`,
   dismissing when the first byte of streamed HTML arrives.
7. Total wall-clock time for full recipe is within ±20% of today's single-call
   time.

---

## Trade-offs explicitly accepted

- **Cook flow loses offline support.** Today the form posts to an API route
  via `fetch` and renders client-side; technically it requires the network
  but the UI shell is available offline. After PR2, `/` requires the network
  to render anything past first paint. Onboarding and saved-dish viewing
  still work offline.
- **3x OpenAI calls for streaming.** PR3 increases per-recipe API spend (3
  smaller calls vs 1 larger). Total token usage is roughly similar; the cost
  is request overhead and rate-limit pressure. UX gain is large.
- **Recipe URLs are not shareable.** `/cook/recipe` is session-backed; a link
  sent to another device shows a redirect to `/`. Saved-dish links
  (`/recipe/:dishId`) only render on the originating device because dishes
  live in localStorage. Server-side dish storage would fix this — out of
  scope here.
- **Save-dish step stays client-side.** The "I'm making it" button uses
  `useNavigate()` after a client-side `addDish()` call, not a `<Form>`.
  Justification: dishes live in localStorage; routing the save through the
  server would require either server-side dish storage (rejected) or smuggling
  the dish through response headers (gross).

## Out of scope

- Server-side dish storage / cross-device sync.
- Server-side image generation persistence.
- True optimistic UI via `useFetcher` for meal selection.
- Sharing recipes between users.
- Re-architecting `LoadingOverlay`, `Toast`, `NavBar` internals.

## Final acceptance criteria (all PRs)

Across all three PRs, the user-visible behaviors that must hold:

1. New user flow: visit `/` → bounced to `/onboarding` → complete two steps →
   land on `/` with greeting populated. No flash of unauthenticated state.
2. Returning user flow: visit `/` → cook page renders fully on first paint.
3. Migration: pre-existing localStorage users get migrated silently on first
   visit to `/onboarding` after deploy.
4. Cook flow: type ingredients → submit → see 3 meals → click one → recipe
   streams in (title first, then ingredients, then steps) → "I'm making it"
   → land on `/profile` with the new dish at the top.
5. Profile flow: view dishes grid → click any → land on
   `/recipe/:dishId` with full recipe → rate → back-button returns to
   `/profile` with rating reflected.
6. Onboarding redirect: a logged-in user visiting `/onboarding` is
   redirected to `/`.
7. Delete-account: clears cookie + localStorage, redirects to `/onboarding`.
8. No `useEffect` in any gated page does profile-loading work.
9. No `loadingMode` / `mounted` / `stage` React state anywhere in the cook
   flow. All driven by URL + `useNavigation` + Suspense.
10. All three of `npm run typecheck`, `npm run build`, and a manual smoke of
    the flow above pass before each PR merges.
