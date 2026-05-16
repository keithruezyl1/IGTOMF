# Remix vs Express, Node, and the usual stack

A working comparison written against this codebase. The examples are real files in `app/`.

## First, the category mismatch

Remix and Express aren't the same kind of thing.

| Tool | What it is |
|---|---|
| **Node.js** | A JavaScript runtime. Runs JS outside the browser. That's all. |
| **Express** | A minimal HTTP routing/middleware library that runs on Node. It does not render HTML, manage state, or know what React is. |
| **Next.js / Remix** | Full-stack web frameworks. They render UI, handle routing, manage data flow between server and client, and ship a build pipeline. They run on Node (or other JS runtimes like Bun, Cloudflare Workers, Vercel Edge). |

So a fair comparison isn't "Remix vs Express." It's **Remix vs (Express + a frontend framework + a build tool + a routing library + a data-fetching library)**. The closest single-tool peer to Remix is Next.js.

The rest of this doc is written as "Remix vs the older stack" — Express on the server, React (or any SPA) on the client, talking to each other over a hand-rolled JSON API.

## The unified route file

This is the central idea. A Remix route file is both the server endpoint AND the React component for that URL.

Look at [app/routes/_app._index.tsx](app/routes/_app._index.tsx) — the cook page at `/`. The same file exports:

```ts
export async function loader({ request }) { /* runs on server when you GET / */ }
export async function action({ request }) { /* runs on server when you POST / */ }
export default function CookRoute() { /* React component rendered with the loader's data */ }
```

The build splits these correctly: `loader` and `action` end up in the server bundle; the component ends up in both bundles (SSR + hydration). You write three exports, the framework wires them together.

**The Express equivalent** would be at least three places:

```
server/routes/cook.ts          — GET /cook  → returns JSON
server/routes/cook.ts          — POST /cook → handles form, returns JSON or redirect
src/pages/Cook.jsx             — React component
src/api/cookClient.ts          — fetch() wrappers calling the above
```

Plus a router config that maps `/cook` to `<Cook />`, plus an SSR setup if you want server rendering, plus serialization glue.

That whole list collapses into one file with Remix.

## Routing is filesystem

In Express:

```ts
app.get("/", handleHome);
app.get("/profile", handleProfile);
app.get("/recipe/:dishId", handleRecipe);
app.post("/onboarding", handleOnboarding);
```

You build the URL tree by hand, in code, separate from your UI.

In Remix it's the file tree, see [app/routes/](app/routes/):

```
_app.tsx                    → layout for everything below
_app._index.tsx             → /
_app.profile.tsx            → /profile
_app.recipe.$dishId.tsx     → /recipe/:dishId
_app.cook.recipe.tsx        → /cook/recipe
onboarding.tsx              → /onboarding
```

The `_app` prefix means "pathless parent" — it groups children without adding a URL segment. The `$` means "URL param." The flatness is convention; nested folders work too.

The real win is **nested layouts**. [app/routes/_app.tsx](app/routes/_app.tsx) renders the NavBar and runs `requireProfile()` in its loader. Every child route inherits both. When the URL changes between `/` and `/profile`, the NavBar doesn't unmount — only the `<Outlet />` swaps. Doing this in Express+React means setting up React Router manually, sharing layout components by hand, and threading auth context separately.

## Data loading: loader vs fetch-on-mount

The Express+React pattern:

```jsx
// React component
useEffect(() => {
  fetch("/api/profile")
    .then(r => r.json())
    .then(setProfile);
}, []);

if (!profile) return <Spinner />;
return <NavBar user={profile} />;
```

Three problems with this:
1. First paint is empty — the user sees a spinner, then content pops in.
2. The component knows about HTTP, JSON shape, loading states, error states.
3. No SSR — the server sends an empty shell.

The Remix pattern, see [app/routes/_app.tsx:9-12](app/routes/_app.tsx#L9-L12):

```ts
export async function loader({ request }) {
  const profile = await requireProfile(request);
  return json({ profile });
}

export default function AppLayout() {
  const { profile } = useLoaderData<typeof loader>();
  return <NavBar username={profile.username} />;
}
```

- The server runs `loader` BEFORE rendering. It reads the cookie, gets the profile.
- The HTML sent to the browser already has the username in it. View-source on the deployed app — the name is there.
- The React component receives `profile` synchronously. No `useState`, no `useEffect`, no loading state, no error boundary needed for this specific case.
- Types flow through `useLoaderData<typeof loader>()` — no API contract drift.

## Mutations: action + Form vs fetch + handleSubmit

Express+React, the typical form pattern:

```jsx
async function handleSubmit(e) {
  e.preventDefault();
  setLoading(true);
  try {
    const res = await fetch("/api/suggest-meals", {
      method: "POST",
      body: JSON.stringify({ ingredients }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setSuggestions(data.suggestions);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

<form onSubmit={handleSubmit}>...</form>
```

You manage four pieces of state (input, loading, error, result) and the form only works with JS enabled.

The Remix version is at [app/routes/_app._index.tsx](app/routes/_app._index.tsx):

```tsx
export async function action({ request }) {
  const form = await request.formData();
  const ingredients = String(form.get("ingredients"));
  const result = await generateMealSuggestions(ingredients);
  if (result.kind === "no-food") return json({ error: result.message }, 400);
  const headers = await flash(request, "cookData", { ... });
  return redirect("/", { headers });
}

// in the component:
const navigation = useNavigation();
const isSuggesting = navigation.state === "submitting";

<Form method="post">
  <textarea name="ingredients" />
  <button type="submit" disabled={isSuggesting}>Submit</button>
</Form>
```

What you got for free:
- `<Form>` works without JS. If the user has JS disabled or it hasn't loaded yet, a normal HTML form POST goes through, the action runs, the response redirects, the next page loads with suggestions. Try it in DevTools.
- `useNavigation()` gives you the pending state without managing a `loading` boolean.
- Errors come back through `useActionData()` — declarative, not imperative.
- The action and the form live in the same file. The contract is types, not URLs.

## Streaming with `defer()`

The recipe page generates content in three OpenAI calls. With Express you'd either:
- Block until all three finish, then return the full page (slow), or
- Hand-roll Server-Sent Events or WebSockets to stream chunks (complex).

In Remix it's [app/routes/_app.cook.recipe.tsx:51-74](app/routes/_app.cook.recipe.tsx#L51-L74):

```ts
return defer({
  titlePromise,
  ingredientsPromise,
  stepsPromise,
});
```

And in the component:

```tsx
<Suspense fallback={<TitleSkeleton />}>
  <Await resolve={titlePromise}>
    {(t) => <h1>{t.title}</h1>}
  </Await>
</Suspense>
```

Remix flushes the initial HTML (with skeletons) immediately, keeps the connection open, and pushes a `<script>` tag down the wire when each promise resolves. The browser swaps the skeleton for the real content as each arrives. This works with normal HTTP — no WebSockets, no SSE library.

## Cookies and sessions

This part is the most similar. In Express:

```ts
import session from "express-session";
app.use(session({ secret: process.env.SESSION_SECRET, ... }));

app.get("/profile", (req, res) => {
  if (!req.session.user) return res.redirect("/onboarding");
  res.render("profile", { user: req.session.user });
});
```

In Remix, see [app/lib/session.server.ts](app/lib/session.server.ts):

```ts
const storage = createCookieSessionStorage<SessionData>({
  cookie: { secrets: [secret], httpOnly: true, ... },
});

export async function requireProfile(request) {
  const profile = await getProfile(request);
  if (!profile) throw redirect("/onboarding");
  return profile;
}
```

Same concept (signed cookie, secret env var, redirect on miss). The difference is:
- Remix's cookie session helper is built in — no middleware to register.
- `throw redirect()` inside a loader is idiomatic; Express needs `return res.redirect()` and the loader analog doesn't really exist.
- The session module uses the `.server.ts` suffix, which tells the bundler "never include this in the client bundle." No risk of leaking `SESSION_SECRET` to the browser.

## Web Standards everywhere

This is the under-appreciated piece. Remix's loaders and actions receive a standard `Request` object (`fetch`-style, the same one browsers use) and return a standard `Response`. Not an Express `req`/`res` pair, not custom objects.

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  request.headers.get("Cookie");  // standard Headers API
  return new Response(JSON.stringify(...), { headers: ... });
}
```

That means:
- Same code runs on Node, Bun, Deno, Cloudflare Workers, Vercel Edge, Vercel Lambda. The runtime is a deploy choice, not a code rewrite.
- Form data, redirects, cookies, streams — all use the web platform's existing primitives.
- Express's `req.body`, `res.send()`, etc., are Express-specific abstractions. Code written against them is locked to Express.

## What you give up

Trade-offs are real:

- **Less server flexibility.** Express lets you mount anything — websockets, gRPC, a custom binary protocol. Remix is opinionated about being a web app. For pure backend services or non-web endpoints, Express is the right tool.
- **Co-location, not separation.** Some teams want a clean line between "the API team" and "the frontend team." Remix smashes that line on purpose. If your team structure depends on the line, the friction is real.
- **Form-first thinking.** The framework rewards forms and navigation. Heavily interactive apps (drag-drop builders, real-time canvases) still use Remix, but a lot of the benefits are less load-bearing — you end up writing more `useFetcher` and client-state.
- **Smaller ecosystem.** Express has 10+ years of middleware. Remix loaders/actions are stateless functions; some of that ecosystem doesn't translate directly.

## When to pick which

| Use case | Pick |
|---|---|
| Marketing site, app with forms, content-driven product | Remix (or Next.js) |
| Pure JSON API with no UI | Express, Fastify, Hono |
| Long-lived WebSocket server | Node + ws / Socket.IO directly |
| Highly interactive SPA where URLs don't matter (game, canvas tool) | Vite + React + thin Express API |
| You want server-rendered React with progressive enhancement | Remix |
| You want maximum control over every byte of HTTP | Express |

## The shape of this project, in one sentence

This codebase has **zero handwritten API endpoints**, **zero `fetch()` calls** from React components for primary data flow (only for the one-shot localStorage migration), **zero loading-state booleans** in the cook flow, and **zero client-side auth checks** — all of those collapsed into loaders, actions, `<Form>`, and `useNavigation()`. That's what Remix replaces.
