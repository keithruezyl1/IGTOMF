# Nested routes refactor — Cook + Profile share a layout

**Date:** 2026-05-16
**Status:** Approved (pending written-spec review)

## Goal

Move the duplicated chrome (`ToastProvider`, `NavBar`) and profile-gate logic
out of `_index.tsx` and `profile.tsx` and into a shared pathless parent route,
using Remix's flat-file nested routing.

URLs do not change. The Cook page stays at `/`, Profile at `/profile`,
Onboarding at `/onboarding`. Only the file structure and where shared logic
lives changes.

## Current state (what we're replacing)

Both [`app/routes/_index.tsx`](../../../app/routes/_index.tsx) and
[`app/routes/profile.tsx`](../../../app/routes/profile.tsx) contain a near-identical
wrapper component pattern:

```tsx
export default function CookRoute() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      navigate("/onboarding", { replace: true });
      return;
    }
    setProfile(p);
  }, [navigate]);

  if (!profile) return null;

  return (
    <ToastProvider>
      <CookInner profile={profile} />
    </ToastProvider>
  );
}
```

The profile route adds `getDishes()` loading on top of this.

Both inner components render `<NavBar username={...} profileImage={...} />` as
their first element.

[`app/routes/onboarding.tsx`](../../../app/routes/onboarding.tsx) is standalone —
no NavBar, no ToastProvider, and redirects *away* if a profile exists.

API resource routes (`api.suggest-meals.ts`, `api.get-recipe.ts`,
`api.search-image.ts`) don't render UI and stay flat.

## Target route tree

```
app/routes/
├── _app.tsx                      (NEW pathless layout)
│   ├── ToastProvider
│   ├── profile gate (redirects to /onboarding if missing)
│   ├── NavBar
│   └── <Outlet context={{ profile }} />
├── _app._index.tsx               (renamed from _index.tsx)
├── _app.profile.tsx              (renamed from profile.tsx)
├── onboarding.tsx                (unchanged)
├── api.suggest-meals.ts          (unchanged)
├── api.get-recipe.ts             (unchanged)
└── api.search-image.ts           (unchanged)
```

The `_app` prefix is Remix flat-routes syntax for a **pathless layout** — it
groups children without contributing a URL segment. So `_app._index.tsx`
matches `/`, and `_app.profile.tsx` matches `/profile`.

## What `_app.tsx` contains

```tsx
import { Outlet, useNavigate, useOutletContext } from "@remix-run/react";
import { useEffect, useState } from "react";
import { NavBar } from "~/components/NavBar";
import { ToastProvider } from "~/components/Toast";
import { getProfile } from "~/lib/storage";
import type { UserProfile } from "~/types";

type AppContext = { profile: UserProfile };

export default function AppLayout() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      navigate("/onboarding", { replace: true });
      return;
    }
    setProfile(p);
  }, [navigate]);

  if (!profile) return <AppSkeleton />;

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

### Skeleton during profile load

`AppSkeleton` renders a placeholder NavBar (logo + neutral avatar circle) and a
centered shimmer/pulse block in the content area, sized roughly to the cook
form's footprint so the layout doesn't jump when the real content swaps in.
The skeleton avoids a flash-of-redirect on the brief client-side
`localStorage` read.

No SSR concerns beyond what's already there — `onboarding.tsx` uses the same
`mounted` pattern today; this just centralizes it.

## What changes in `_app._index.tsx` (was `_index.tsx`)

- Delete the `CookRoute` wrapper (lines 298–318).
- The default export becomes a thin shim that pulls `profile` from context and
  renders `CookInner`:

  ```tsx
  import { useAppContext } from "./_app";

  export default function CookRoute() {
    const { profile } = useAppContext();
    return <CookInner profile={profile} />;
  }
  ```

- Remove the `<NavBar ... />` element from `CookInner`'s JSX (line 139). The
  parent renders it now.
- Remove the `ToastProvider` import. `useToast` calls inside `CookInner` keep
  working because the provider is now an ancestor.

## What changes in `_app.profile.tsx` (was `profile.tsx`)

- Delete the `ProfileRoute` wrapper (lines 290–311).
- The default export becomes:

  ```tsx
  import { useEffect, useState } from "react";
  import { useAppContext } from "./_app";

  export default function ProfileRoute() {
    const { profile } = useAppContext();
    const [dishes, setDishes] = useState<Dish[] | null>(null);

    useEffect(() => {
      setDishes(getDishes());
    }, []);

    if (!dishes) return null;
    return <ProfileInner profile={profile} initialDishes={dishes} />;
  }
  ```

- Dishes stay loaded locally — they're profile-page-specific and don't belong in
  the shared layout's state.
- Remove the `<NavBar ... />` element from `ProfileInner`'s JSX (line 59).
- Remove the `ToastProvider` import.

## What does NOT change

- `app/root.tsx` — its single `<Outlet />` still renders the matched top-level
  route (now `_app` for `/` and `/profile`, `onboarding` for `/onboarding`).
- `app/routes/onboarding.tsx` — stays outside the `_app` parent so it isn't
  caught by the profile-gate redirect (would cause a redirect loop).
- All three `api.*.ts` resource routes.
- URLs — `/`, `/profile`, `/onboarding` resolve exactly as before.
- The `NavBar`, `ToastProvider`, `CookInner`, `ProfileInner` components
  themselves.

## Side effect worth noting

With `ToastProvider` hoisted to the layout, a toast triggered on the Cook page
survives client-side navigation to `/profile`. Today the provider unmounts on
each route swap and toasts disappear instantly. This is a minor UX improvement,
not a regression, but flagging for awareness in case any current toast assumes
the page hasn't changed.

Similarly, `NavBar` is no longer remounted on `/` ↔ `/profile` transitions, so
any internal NavBar state would persist. NavBar currently appears to be
stateless rendering of props, so no impact expected — verify during
implementation.

## Out of scope

- Loading the profile server-side via a Remix `loader`. Profile lives in
  `localStorage`, so the load stays client-side.
- Adding new routes or splitting Cook into sub-routes (`/cook/suggestions`,
  `/cook/recipe`). Those are state transitions today and stay that way.
- Refactoring `getProfile()` / `getDishes()` storage logic.
- Onboarding nesting under a shared layout.

## Acceptance criteria

1. Navigating to `/` and `/profile` works identically to before (visually and
   behaviorally) for a logged-in user.
2. Navigating to `/` or `/profile` with no profile in `localStorage` redirects
   to `/onboarding`.
3. `/onboarding` with no profile renders the wizard; with a profile, redirects
   to `/`.
4. The profile-gate `useEffect` exists in exactly one place (`_app.tsx`).
5. `<NavBar>` is rendered in exactly one place (`_app.tsx`).
6. `<ToastProvider>` is rendered in exactly one place (`_app.tsx`).
7. During the brief client-side profile load, a skeleton renders (no white
   flash, no momentary NavBar with empty username).
8. `npm run typecheck` and `npm run build` succeed.
9. API routes `/api/suggest-meals`, `/api/get-recipe`, `/api/search-image` all
   still respond.
