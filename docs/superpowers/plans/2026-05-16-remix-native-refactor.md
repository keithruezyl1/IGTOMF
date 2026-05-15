# Remix-Native Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the cook + profile flow from "Remix-as-bundler" to "Remix-as-framework" — server-side profile sessions, pathless nested layout, form-driven cook flow, `useNavigation` pending UI, and `defer()` streaming for the recipe. URLs and user-visible behavior unchanged.

**Architecture:** Three PRs in dependency order — (PR1) profile cookie + `_app` pathless layout, (PR2) cook flow becomes Remix Form/action driven, (PR3) recipe loader uses `defer()` with three sequential structured-output calls so title/ingredients/steps stream in.

**Tech Stack:** Remix 2.13 (`@remix-run/node`, `@remix-run/react`, `@vercel/remix`), React 18.3, TypeScript 5.6, Tailwind, OpenAI SDK 4.67, motion/react.

**Spec:** [`docs/superpowers/specs/2026-05-16-nested-routes-design.md`](../specs/2026-05-16-nested-routes-design.md)

**Verification policy:** This project has no test framework. Every task verifies via one or more of:
- `npm run typecheck` — type errors
- `npm run build` — production build success
- `npm run dev` + a specific URL/interaction in the browser — runtime behavior
- Direct file reads to confirm refactor outcomes

**Branch policy:** Each PR is a separate branch off `main`. Tasks within a PR commit on that branch.

---

## File map (final state)

```
app/
├── lib/
│   ├── session.server.ts          NEW (PR1) — cookie session + profile + flash helpers
│   ├── dishes.client.ts           RENAMED from storage.ts (PR1) — dishes-only, no profile
│   ├── ai.server.ts               NEW (PR2) — extracted OpenAI generation functions
│   ├── openai.server.ts           UNCHANGED
│   ├── unsplash.server.ts         UNCHANGED
│   └── mustafo.ts                 UNCHANGED
├── routes/
│   ├── _app.tsx                   NEW (PR1) — pathless layout, profile gate, NavBar, Toast
│   ├── _app._index.tsx            RENAMED from _index.tsx (PR1, modified PR2/PR3)
│   ├── _app.profile.tsx           RENAMED from profile.tsx (PR1)
│   ├── _app.recipe.$dishId.tsx    NEW (PR1) — saved-recipe deep link
│   ├── _app.cook.recipe.tsx       NEW (PR2, streaming PR3) — in-flow recipe page
│   ├── onboarding.tsx             MODIFIED (PR1) — loader + action + migration shim
│   ├── api.search-image.ts        UNCHANGED
│   ├── api.suggest-meals.ts       DELETED (PR2)
│   └── api.get-recipe.ts          DELETED (PR2)
├── components/
│   ├── DishHistoryCard.tsx        MODIFIED (PR1) — onOpen prop replaced with to prop
│   ├── SavedRecipeView.tsx        NEW (PR1) — extracted dish-modal markup
│   ├── RecipeSkeleton.tsx         NEW (PR3) — fallbacks for Suspense
│   └── (others unchanged)
└── root.tsx                       UNCHANGED
```

---

# PR1 — Profile cookie + nested routes

**Branch:** `refactor/pr1-cookies-and-layout`

**Goal:** Move profile from localStorage to a signed cookie. Introduce `_app` pathless layout. Replace dish modal with `/recipe/:dishId` page. Migrate existing localStorage users silently. Cook flow internals unchanged.

---

### Task 1: Create branch and add SESSION_SECRET handling

**Files:**
- Modify: `.env` (create if missing — gitignored)
- Modify: `.env.example` (create if missing — committed)

- [ ] **Step 1: Create the PR1 branch**

```bash
git checkout main
git pull --ff-only
git checkout -b refactor/pr1-cookies-and-layout
```

- [ ] **Step 2: Check whether `.env.example` exists**

Run: `ls .env.example 2>$null; ls .env 2>$null`
If `.env.example` exists, read it before editing. If `.env` exists, check whether it already contains `SESSION_SECRET`.

- [ ] **Step 3: Add SESSION_SECRET to `.env.example`**

Append to `.env.example` (create the file if it does not exist; do not include the literal angle brackets in `<...>`):

```
# Signs the user-session cookie. Any random 32+ char string.
SESSION_SECRET=<replace-with-random-32-char-string>
```

- [ ] **Step 4: Add SESSION_SECRET to `.env`**

Append to `.env` (this file is gitignored). Generate a real value:

```bash
# PowerShell:
"SESSION_SECRET=$([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))" | Add-Content .env
```

Verify the file ends with a `SESSION_SECRET=<64-hex-chars>` line. Do not commit `.env`.

- [ ] **Step 5: Verify `.gitignore` excludes `.env`**

Run: `git check-ignore .env`
Expected: prints `.env` (meaning it is ignored).
If output is empty, append `.env` to `.gitignore` before continuing.

- [ ] **Step 6: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: document SESSION_SECRET env var for cookie sessions"
```

---

### Task 2: Create `session.server.ts` with profile readers

**Files:**
- Create: `app/lib/session.server.ts`

- [ ] **Step 1: Confirm SESSION_SECRET is in env**

Run: `(Get-Content .env | Select-String "^SESSION_SECRET=").Line`
Expected: prints `SESSION_SECRET=...` with a value. If empty, redo Task 1 Step 4.

- [ ] **Step 2: Create the session module**

Create `app/lib/session.server.ts`:

```ts
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import type { UserProfile } from "~/types";

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error(
    "SESSION_SECRET is not set. Add it to .env (see .env.example).",
  );
}

type SessionData = {
  profile: UserProfile;
};

type SessionFlash = {
  // Filled in by Task 3 for flash-typed values. Keep this type loose: flash
  // payloads are heterogeneous (CookData, RecipeJob, etc.). Each consumer
  // narrows with a generic.
  [key: string]: unknown;
};

const storage = createCookieSessionStorage<SessionData, SessionFlash>({
  cookie: {
    name: "igtimf_session",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secrets: [secret],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
});

export async function getSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getProfile(
  request: Request,
): Promise<UserProfile | null> {
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
```

- [ ] **Step 3: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/lib/session.server.ts
git commit -m "feat(session): add cookie session storage and profile readers"
```

---

### Task 3: Add `setProfile`, `clearProfile`, and flash helpers

**Files:**
- Modify: `app/lib/session.server.ts`

- [ ] **Step 1: Append the writers and flash helpers**

Append to `app/lib/session.server.ts` (after `requireProfile`):

```ts
export async function setProfile(request: Request, profile: UserProfile) {
  const session = await getSession(request);
  session.set("profile", profile);
  const cookie = await storage.commitSession(session);
  const headers = new Headers();
  headers.append("Set-Cookie", cookie);
  return headers;
}

export async function clearProfile(request: Request) {
  const session = await getSession(request);
  const cookie = await storage.destroySession(session);
  const headers = new Headers();
  headers.append("Set-Cookie", cookie);
  return headers;
}

/**
 * Sets a flash value on the session. Caller MUST attach the returned Headers
 * to its response so the cookie is updated. The next session read on the same
 * client picks up the value once, then it is gone.
 */
export async function flash<T>(
  request: Request,
  key: string,
  value: T,
): Promise<Headers> {
  const session = await getSession(request);
  session.flash(key, value);
  const cookie = await storage.commitSession(session);
  const headers = new Headers();
  headers.append("Set-Cookie", cookie);
  return headers;
}

/**
 * Reads and clears a flash value. Caller MUST attach the returned Headers to
 * its response so the cleared-flash state persists. If you do not attach
 * them, the value will be re-read on the next request.
 */
export async function consumeFlash<T>(
  request: Request,
  key: string,
): Promise<{ value: T | undefined; headers: Headers }> {
  const session = await getSession(request);
  const value = session.get(key) as T | undefined;
  const cookie = await storage.commitSession(session);
  const headers = new Headers();
  headers.append("Set-Cookie", cookie);
  return { value, headers };
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/session.server.ts
git commit -m "feat(session): add setProfile, clearProfile, flash helpers"
```

---

### Task 4: Split `storage.ts` into `dishes.client.ts`

**Files:**
- Create: `app/lib/dishes.client.ts`
- Delete: `app/lib/storage.ts`

- [ ] **Step 1: Find current importers of `~/lib/storage`**

Run: 
```bash
grep -rn "from \"~/lib/storage\"" app/
```
Expected output: imports in `app/routes/_index.tsx`, `app/routes/profile.tsx`, `app/routes/onboarding.tsx`.

- [ ] **Step 2: Create `app/lib/dishes.client.ts`**

```ts
import type { Dish } from "~/types";

const DISHES_KEY = "igotthis_dishes";

export function getDishes(): Dish[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DISHES_KEY);
    return raw ? (JSON.parse(raw) as Dish[]) : [];
  } catch {
    return [];
  }
}

export function setDishes(dishes: Dish[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISHES_KEY, JSON.stringify(dishes));
}

export function addDish(dish: Dish) {
  const dishes = getDishes();
  dishes.unshift(dish);
  setDishes(dishes);
}

export function updateDishRating(id: string, rating: number) {
  const dishes = getDishes().map((d) => (d.id === id ? { ...d, rating } : d));
  setDishes(dishes);
}

export function clearDishes() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DISHES_KEY);
}

export const LEGACY_PROFILE_KEY = "igotthis_profile";
```

The `.client.ts` suffix tells Remix to never include this file in the server bundle.

- [ ] **Step 3: Delete `app/lib/storage.ts`**

```bash
git rm app/lib/storage.ts
```

- [ ] **Step 4: Do NOT update importers yet**

Importers still reference `~/lib/storage` — they will fail typecheck right now. That is expected. Tasks 5, 7, 8 will update each one in turn. Do not run typecheck yet.

- [ ] **Step 5: Commit**

```bash
git add app/lib/dishes.client.ts
git commit -m "refactor(storage): split out client-only dishes module"
```

(`git rm` already staged the deletion.)

---

### Task 5: Convert onboarding to cookie-based with migration shim

**Files:**
- Modify: `app/routes/onboarding.tsx` (full rewrite)

- [ ] **Step 1: Re-read the current onboarding to know what UI to preserve**

```bash
git show HEAD:app/routes/onboarding.tsx
```
Note the step 1 / step 2 JSX structure — preserve all visual markup.

- [ ] **Step 2: Replace the file**

Replace `app/routes/onboarding.tsx` with:

```tsx
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useNavigate, useNavigation } from "@remix-run/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { MustafoBubble } from "~/components/MustafoBubble";
import { LEGACY_PROFILE_KEY } from "~/lib/dishes.client";
import { EXPRESSIONS } from "~/lib/mustafo";
import { getProfile, setProfile } from "~/lib/session.server";
import type { UserProfile } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const profile = await getProfile(request);
  if (profile) throw redirect("/");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "migrate") {
    const raw = String(form.get("profile") ?? "");
    try {
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      if (
        typeof parsed.username !== "string" ||
        parsed.username.trim().length < 2
      ) {
        return json({ ok: false, error: "Invalid migrate payload" }, 400);
      }
      const profile: UserProfile = {
        username: parsed.username.trim(),
        profileImage:
          typeof parsed.profileImage === "string" ? parsed.profileImage : null,
        createdAt:
          typeof parsed.createdAt === "string"
            ? parsed.createdAt
            : new Date().toISOString(),
      };
      const headers = await setProfile(request, profile);
      return json({ ok: true }, { headers });
    } catch {
      return json({ ok: false, error: "Bad JSON" }, 400);
    }
  }

  if (intent === "logout") {
    const { clearProfile } = await import("~/lib/session.server");
    const headers = await clearProfile(request);
    return redirect("/onboarding", { headers });
  }

  // Default: complete onboarding.
  const username = String(form.get("username") ?? "").trim();
  const profileImage = String(form.get("profileImage") ?? "") || null;
  if (username.length < 2 || username.length > 50) {
    return json({ error: "Pick a name between 2 and 50 characters." }, 400);
  }
  const profile: UserProfile = {
    username,
    profileImage,
    createdAt: new Date().toISOString(),
  };
  const headers = await setProfile(request, profile);
  return redirect("/", { headers });
}

export default function Onboarding() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // One-time localStorage → cookie migration for pre-cookie users.
  useEffect(() => {
    setMounted(true);
    const raw = window.localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!raw) return;
    const body = new FormData();
    body.set("intent", "migrate");
    body.set("profile", raw);
    fetch("/onboarding", { method: "POST", body }).then((res) => {
      if (res.ok) {
        window.localStorage.removeItem(LEGACY_PROFILE_KEY);
        window.location.replace("/");
      }
    });
  }, []);

  const nameValid =
    username.trim().length >= 2 && username.trim().length <= 50;

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setProfileImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  const isSubmitting = navigation.state === "submitting";

  if (!mounted) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-5 md:p-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <motion.img
            src={EXPRESSIONS[step === 1 ? 1 : 4]}
            alt="Mustafo"
            className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
            initial={{ y: -40, opacity: 0, rotate: -8 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            key={step}
          />
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full transition-all ${
                step >= 1 ? "bg-fresh w-8" : "bg-soft"
              }`}
            />
            <span
              className={`w-2 h-2 rounded-full transition-all ${
                step >= 2 ? "bg-fresh w-8" : "bg-soft"
              }`}
            />
          </div>
        </div>

        <Form method="post">
          <input type="hidden" name="username" value={username.trim()} />
          <input
            type="hidden"
            name="profileImage"
            value={profileImage ?? ""}
          />
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <Step1
                key="step1"
                username={username}
                setUsername={setUsername}
                onNext={() => nameValid && setStep(2)}
                disabled={!nameValid}
              />
            ) : (
              <Step2
                key="step2"
                username={username}
                profileImage={profileImage}
                onPick={handleFile}
                onSkip={() => {
                  setProfileImage(null);
                  // submit via the form by clicking the hidden submit
                }}
                isSubmitting={isSubmitting}
              />
            )}
          </AnimatePresence>
        </Form>
      </div>
    </main>
  );
}

function Step1(props: {
  username: string;
  setUsername: (v: string) => void;
  onNext: () => void;
  disabled: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="card-base p-7 md:p-9"
    >
      <h1 className="font-display font-bold text-2xl md:text-3xl mb-2 text-ink">
        Hey! I'm Mustafo.
      </h1>
      <p className="font-body text-muted mb-6">What should I call you?</p>
      <input
        type="text"
        value={props.username}
        onChange={(e) => props.setUsername(e.target.value)}
        placeholder="your name"
        className="input-base"
        autoFocus
      />
      <button
        type="button"
        onClick={props.onNext}
        disabled={props.disabled}
        className="btn-primary mt-5 w-full"
      >
        Continue
      </button>
    </motion.section>
  );
}

function Step2(props: {
  username: string;
  profileImage: string | null;
  onPick: (file: File) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="card-base p-7 md:p-9"
    >
      <h1 className="font-display font-bold text-2xl md:text-3xl mb-2 text-ink">
        Nice to meet you, {props.username.split(" ")[0]}.
      </h1>
      <p className="font-body text-muted mb-6">
        Wanna add a profile picture? Totally optional.
      </p>
      <label className="block border-2 border-dashed border-soft rounded-2xl p-6 text-center cursor-pointer hover:bg-soft/30">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onPick(f);
          }}
        />
        {props.profileImage ? (
          <img
            src={props.profileImage}
            alt="preview"
            className="w-24 h-24 mx-auto rounded-full object-cover"
          />
        ) : (
          <span className="font-body text-sm text-muted">
            Tap to choose a photo
          </span>
        )}
      </label>
      <div className="flex gap-3 mt-5">
        <button
          type="button"
          onClick={props.onSkip}
          className="btn-ghost flex-1"
          disabled={props.isSubmitting}
        >
          Skip
        </button>
        <button
          type="submit"
          className="btn-primary flex-1"
          disabled={props.isSubmitting}
        >
          {props.isSubmitting ? "Saving..." : "Let's cook"}
        </button>
      </div>
    </motion.section>
  );
}
```

Note: the "Skip" button submits the form too — but with `profileImage` already cleared by `onSkip`. Add this small adjustment to make Skip submit:

- [ ] **Step 3: Make Skip submit the form**

Replace the `Skip` `<button type="button">` element above with:

```tsx
<button
  type="submit"
  onClick={() => props.onSkip()}
  className="btn-ghost flex-1"
  disabled={props.isSubmitting}
>
  Skip
</button>
```

(`onSkip` clears `profileImage` first, then the button's default submit fires. The hidden `profileImage` input now reads `""`.)

- [ ] **Step 4: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors. (Other files still reference `~/lib/storage` from Task 4 — that breaks elsewhere but not in this file.)

If you see errors in `_index.tsx` / `profile.tsx` about `~/lib/storage`, that is fine — Tasks 7 and 8 fix them.

- [ ] **Step 5: Commit**

```bash
git add app/routes/onboarding.tsx
git commit -m "feat(onboarding): use cookie session + add localStorage migration shim"
```

---

### Task 6: Create the `_app.tsx` pathless layout

**Files:**
- Create: `app/routes/_app.tsx`

- [ ] **Step 1: Create the layout**

Create `app/routes/_app.tsx`:

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
      <NavBar
        username={profile.username}
        profileImage={profile.profileImage}
      />
      <Outlet context={{ profile } satisfies AppContext} />
    </ToastProvider>
  );
}

export function useAppContext() {
  return useOutletContext<AppContext>();
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: still has errors in `_index.tsx` and `profile.tsx` (pending Tasks 7, 8). The new `_app.tsx` itself should have no errors. If `_app.tsx` has errors, fix them.

- [ ] **Step 3: Commit**

```bash
git add app/routes/_app.tsx
git commit -m "feat(routes): add _app pathless layout with profile gate"
```

---

### Task 7: Move `_index.tsx` under the `_app` layout

**Files:**
- Move: `app/routes/_index.tsx` → `app/routes/_app._index.tsx`
- Modify the moved file: remove wrapper, remove NavBar, remove ToastProvider, read profile from context

- [ ] **Step 1: Rename the file**

```bash
git mv app/routes/_index.tsx app/routes/_app._index.tsx
```

- [ ] **Step 2: Remove the `CookRoute` wrapper and the `<NavBar>` element**

In `app/routes/_app._index.tsx`, make these changes:

**(a)** Replace the `import { getProfile } from "~/lib/storage";` line at the top with:

```tsx
import { useAppContext } from "./_app";
```

If there is also an `import { addDish } from "~/lib/storage";`, change it to:

```tsx
import { addDish } from "~/lib/dishes.client";
```

**(b)** Remove the `ToastProvider` import. The line was:

```tsx
import { ToastProvider, useToast } from "~/components/Toast";
```

Change to:

```tsx
import { useToast } from "~/components/Toast";
```

**(c)** Remove the `NavBar` import. The line was:

```tsx
import { NavBar } from "~/components/NavBar";
```

Delete that line entirely.

**(d)** Inside `CookInner`'s JSX, remove the `<NavBar ... />` element. The current line (~139):

```tsx
<NavBar username={profile.username} profileImage={profile.profileImage} />
```

Delete it.

**(e)** Replace the entire `CookRoute` default-export function at the bottom of the file (lines 298–318) with:

```tsx
export default function CookRoute() {
  const { profile } = useAppContext();
  return <CookInner profile={profile} />;
}
```

Remove the now-unused `useNavigate`, `useState`, `useEffect` imports if they were only used by the old `CookRoute`. (They are also used by `CookInner` — `useEffect` and `useState` stay. `useNavigate` may stay; it is also used inside `makingIt`'s redirect logic.)

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: errors clear in this file. May still error in `profile.tsx` (Task 8) and the deleted `storage.ts` (Task 4 already removed it — `_app._index.tsx` no longer imports it).

- [ ] **Step 4: Commit**

```bash
git add app/routes/_app._index.tsx
git commit -m "refactor(routes): move cook page under _app layout"
```

---

### Task 8: Move `profile.tsx` under `_app` layout, replace modal with link

**Files:**
- Move: `app/routes/profile.tsx` → `app/routes/_app.profile.tsx`
- Modify the moved file

- [ ] **Step 1: Rename the file**

```bash
git mv app/routes/profile.tsx app/routes/_app.profile.tsx
```

- [ ] **Step 2: Update imports**

In `app/routes/_app.profile.tsx`:

Replace:
```tsx
import {
  clearAll,
  getDishes,
  getProfile,
  updateDishRating,
} from "~/lib/storage";
```

With:
```tsx
import {
  clearDishes,
  getDishes,
  updateDishRating,
} from "~/lib/dishes.client";
import { useAppContext } from "./_app";
```

Replace:
```tsx
import { NavBar } from "~/components/NavBar";
```

(delete that line).

Replace:
```tsx
import { ToastProvider, useToast } from "~/components/Toast";
```

With:
```tsx
import { useToast } from "~/components/Toast";
```

- [ ] **Step 3: Remove the `<NavBar>` element from `ProfileInner`**

Inside `ProfileInner`'s JSX, line ~59:

```tsx
<NavBar username={profile.username} profileImage={profile.profileImage} />
```

Delete it.

- [ ] **Step 4: Update the delete-account handler**

Find `handleDelete` (around line 38):

```tsx
function handleDelete() {
  clearAll();
  window.location.href = "/onboarding";
}
```

Replace with:

```tsx
function handleDelete() {
  clearDishes();
  const body = new FormData();
  body.set("intent", "logout");
  fetch("/onboarding", { method: "POST", body }).then(() => {
    window.location.href = "/onboarding";
  });
}
```

- [ ] **Step 5: Replace the dish modal with `<Link>` navigation**

Find the `openDish` state (line ~29) and the `<Modal>` block with `title={openDish?.dishName}` (lines ~197–260). Delete them entirely:

- Delete: `const [openDish, setOpenDish] = useState<Dish | null>(null);`
- Delete: the whole `<Modal open={!!openDish} ...>...</Modal>` block.

Find the `<DishHistoryCard>` element inside the dishes grid (~line 151):

```tsx
<DishHistoryCard
  key={d.id}
  dish={d}
  onRate={(r) => handleRate(d.id, r)}
  onOpen={() => setOpenDish(d)}
/>
```

Replace with:

```tsx
<DishHistoryCard
  key={d.id}
  dish={d}
  onRate={(r) => handleRate(d.id, r)}
  to={`/recipe/${d.id}`}
/>
```

(`DishHistoryCard` gets a new `to` prop in Task 10 — typecheck will fail until then.)

Remove the `Modal` import if it is no longer used. (Verify: the delete-confirmation modal at the bottom still uses `<Modal>`. So keep the import.)

Remove `import { StarRating }` if it is no longer used. (The `StarRating` inside the deleted modal is gone; check whether anywhere else in this file uses it. If not, remove it.)

- [ ] **Step 6: Replace the wrapper**

Replace the `ProfileRoute` default-export function (lines ~290–311) with:

```tsx
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

Remove the `useNavigate` import if it is no longer used. Keep `useState` and `useEffect`.

- [ ] **Step 7: Verify typecheck (will fail until Task 10)**

Run: `npm run typecheck`
Expected: one error in `_app.profile.tsx` about `DishHistoryCard`'s `to` prop. That is fine. Continue.

- [ ] **Step 8: Commit**

```bash
git add app/routes/_app.profile.tsx
git commit -m "refactor(routes): move profile under _app, replace modal with /recipe/:id link"
```

---

### Task 9: Create the saved-recipe page

**Files:**
- Create: `app/components/SavedRecipeView.tsx`
- Create: `app/routes/_app.recipe.$dishId.tsx`

- [ ] **Step 1: Extract the saved-recipe markup into a component**

Create `app/components/SavedRecipeView.tsx`:

```tsx
import { Link } from "@remix-run/react";
import { StarRating } from "./StarRating";
import type { Dish } from "~/types";

type Props = {
  dish: Dish;
  onRate: (rating: number) => void;
};

export function SavedRecipeView({ dish, onRate }: Props) {
  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 pt-6 pb-24">
      <Link
        to="/profile"
        className="font-display font-semibold text-sm text-muted hover:text-ink inline-flex items-center gap-1 mb-4"
      >
        <span aria-hidden>←</span> Back to profile
      </Link>

      <article className="card-base p-6 md:p-8 space-y-6">
        {dish.mealImage && (
          <img
            src={dish.mealImage}
            alt={dish.dishName}
            className="w-full h-48 md:h-64 object-cover rounded-[16px]"
          />
        )}
        <header>
          <h1 className="font-display font-bold text-3xl md:text-4xl text-ink leading-tight">
            {dish.dishName}
          </h1>
          <p className="font-body text-sm text-muted italic mt-2">
            Originally from: "{dish.originalIngredients}"
          </p>
        </header>

        <div>
          <StarRating value={dish.rating} onChange={onRate} size={24} />
        </div>

        <section>
          <h2 className="font-display font-bold text-lg mb-2 text-ink">
            Ingredients
          </h2>
          <ul className="flex flex-col gap-1">
            {dish.recipe.ingredients.map((i, idx) => (
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
          <h2 className="font-display font-bold text-lg mb-2 text-ink">
            Steps
          </h2>
          <ol className="flex flex-col gap-2.5">
            {dish.recipe.instructions.map((s, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-fresh text-white font-display font-bold text-xs grid place-items-center">
                  {idx + 1}
                </span>
                <p className="font-body text-sm text-ink leading-relaxed pt-0.5">
                  {s}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </main>
  );
}
```

- [ ] **Step 2: Create the saved-recipe route**

Create `app/routes/_app.recipe.$dishId.tsx`:

```tsx
import { Link, useParams } from "@remix-run/react";
import { useEffect, useState } from "react";

import { SavedRecipeView } from "~/components/SavedRecipeView";
import { useToast } from "~/components/Toast";
import { getDishes, updateDishRating } from "~/lib/dishes.client";
import type { Dish } from "~/types";

export default function SavedRecipeRoute() {
  const { dishId } = useParams();
  const { notify } = useToast();
  // undefined = loading, null = not found, Dish = found
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
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: still one error in `_app.profile.tsx` about `DishHistoryCard`'s `to` prop. The new files type-clean.

- [ ] **Step 4: Commit**

```bash
git add app/components/SavedRecipeView.tsx app/routes/_app.recipe.$dishId.tsx
git commit -m "feat(routes): add /recipe/:dishId saved-recipe deep link"
```

---

### Task 10: Update `DishHistoryCard` to use `<Link>`, finish PR1

**Files:**
- Modify: `app/components/DishHistoryCard.tsx`

- [ ] **Step 1: Swap `onOpen` for `to`**

Replace `app/components/DishHistoryCard.tsx` entirely:

```tsx
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
```

Key changes: `onOpen` → `to`, the article becomes a `<Link>` wrapping the same markup, the star-rating click handler does `preventDefault` to avoid following the link when rating.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: clean (no errors).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Run dev server and smoke-test**

Open a second terminal:

```bash
npm run dev
```

In a browser at `http://localhost:5173`:

1. **Fresh user:** Open a private/incognito window. Visit `/`. Expect: redirect to `/onboarding`.
2. **Complete onboarding:** Enter a name → Continue → Skip (or upload an image) → "Let's cook". Expect: redirect to `/`, page renders with greeting `Hey <name>` and NavBar populated. No flicker.
3. **Profile page:** Click "Profile" in nav → expect dishes-empty card.
4. **Reload `/`** Expect: cook page renders immediately on first paint. View source — the HTML should already contain the greeting (server-side rendered).
5. **Visit `/onboarding`** while logged in. Expect: redirect to `/`.
6. **Migration:** In DevTools console:
   ```js
   localStorage.setItem("igotthis_profile", JSON.stringify({
     username: "Migrated User",
     profileImage: null,
     createdAt: new Date().toISOString(),
   }));
   ```
   Clear cookies (DevTools → Application → Cookies → clear `igtimf_session`).
   Visit `/onboarding`. Expect: brief render of onboarding step 1 then automatic redirect to `/` with `Hey Migrated User`. Confirm `localStorage.getItem("igotthis_profile")` is now `null`.
7. **Save a dish, then test the new deep link:** From `/`, type "chicken, garlic, pasta", pick a meal, click "I'm making it". Land on `/profile`. Click the dish card — expect navigation to `/recipe/<uuid>` showing the recipe. Browser back button returns to `/profile` with the dish still listed.
8. **Delete account:** From `/profile`, click "Delete account & start fresh" → confirm. Expect: redirect to `/onboarding`. Cookie cleared, dishes cleared.

If any of those fail, fix before continuing. Common failure modes:
- "SESSION_SECRET is not set" at server start → re-check `.env`.
- 404 on `/recipe/<uuid>` → file is named `_app.recipe.$dishId.tsx` (dollar sign).
- Modal still appears on profile → the old `Modal` block in `_app.profile.tsx` was not fully removed.

- [ ] **Step 5: Commit and open PR1**

```bash
git add app/components/DishHistoryCard.tsx
git commit -m "refactor(DishHistoryCard): use Link instead of onOpen callback"
git push -u origin refactor/pr1-cookies-and-layout
```

Open the pull request manually (or via `gh pr create`) titled: `Refactor: cookie sessions + nested _app layout (PR1 of 3)`. Body references the spec.

**Stop here. Get PR1 reviewed and merged before starting PR2.**

---

# PR2 — Form-driven cook flow

**Branch:** `refactor/pr2-form-actions`

**Goal:** Cook flow stops using `fetch()` to API routes and becomes Remix Form/action driven. `useNavigation` replaces `loadingMode` state. The stage state machine (`"chat" | "suggestions" | "recipe"`) goes away — stage is now URL-derived.

**Prerequisite:** PR1 is merged to `main`.

---

### Task 11: Branch off main, extract suggest-meals to ai.server.ts

**Files:**
- Create: `app/lib/ai.server.ts`

- [ ] **Step 1: Branch**

```bash
git checkout main
git pull --ff-only
git checkout -b refactor/pr2-form-actions
```

- [ ] **Step 2: Create `app/lib/ai.server.ts` with the suggestions function**

```ts
import { getOpenAI, MUSTAFO_SYSTEM_PROMPT } from "~/lib/openai.server";
import { searchUnsplashImage } from "~/lib/unsplash.server";
import type { MealSuggestion, Recipe } from "~/types";

const SUGGEST_PROMPT = (ingredients: string) => `A user wrote: "${ingredients}"

STEP 1 — Validate. Is there at least ONE real edible food ingredient in there? Pantry staples, proteins, produce, dairy, grains, condiments, even snacks — all count as food. Spoiled/expired food still counts (we'll just joke about it). NON-food includes: electronics, furniture, tools, office supplies, toys, animals (pets), drugs, soap, random objects. Mixed input (e.g. "chicken and a keyboard") still has food — we work with the chicken.

STEP 2 — Respond in STRICT JSON, no markdown, no commentary.

IF the input has zero real food ingredients, respond with:
{
  "noFood": true,
  "message": "1-2 sentences in Mustafo's voice gently roasting the user for trying to cook with non-food. Mention the specific weird items. Be playful, not mean. End by asking them to try again with actual food."
}

OTHERWISE, suggest 3 meals using only the food ingredients (ignore the non-food stuff):
{
  "suggestions": [
    {
      "name": "string (short, appetizing)",
      "emoji": "single food emoji",
      "why": "1-2 short sentences in Mustafo's voice explaining why this works",
      "likelihood": number between 75 and 96
    }
  ]
}

Exactly 3 suggestions when responding with suggestions. Different cuisines / styles when possible.`;

export type SuggestionsResult =
  | { kind: "ok"; suggestions: MealSuggestion[] }
  | { kind: "no-food"; message: string }
  | { kind: "error"; message: string };

export async function generateMealSuggestions(
  ingredients: string,
): Promise<SuggestionsResult> {
  try {
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.85,
      messages: [
        { role: "system", content: MUSTAFO_SYSTEM_PROMPT },
        { role: "user", content: SUGGEST_PROMPT(ingredients) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      suggestions?: Array<Omit<MealSuggestion, "imageUrl" | "description">>;
      noFood?: boolean;
      message?: string;
    };

    if (parsed.noFood) {
      return {
        kind: "no-food",
        message:
          parsed.message ??
          "I'm a chef, not a magician. Try giving me actual food this time?",
      };
    }

    const base = (parsed.suggestions ?? []).slice(0, 3).map((s) => ({
      name: String(s.name ?? "Mystery Meal"),
      emoji: String(s.emoji ?? "🍳"),
      why: String(s.why ?? ""),
      description: String(s.why ?? ""),
      likelihood: Math.max(60, Math.min(99, Number(s.likelihood) || 85)),
    })) as MealSuggestion[];

    if (base.length === 0) {
      return {
        kind: "error",
        message: "Mustafo blanked. Try rewording your ingredients?",
      };
    }

    const withImages = await Promise.all(
      base.map(async (s) => ({
        ...s,
        imageUrl: await searchUnsplashImage(s.name),
      })),
    );
    return { kind: "ok", suggestions: withImages };
  } catch (err) {
    console.error("generateMealSuggestions error", err);
    return {
      kind: "error",
      message:
        "Mustafo's pan caught fire. Try again in a sec? (Check your OPENAI_API_KEY is set.)",
    };
  }
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/lib/ai.server.ts
git commit -m "feat(ai): extract generateMealSuggestions from api route"
```

---

### Task 12: Extract `generateRecipe` into `ai.server.ts`

**Files:**
- Modify: `app/lib/ai.server.ts`

- [ ] **Step 1: Append the recipe function**

Append to `app/lib/ai.server.ts`:

```ts
const RECIPE_PROMPT = (dish: string, ingredients: string) => `Recipe for: "${dish}"
Available ingredients from user: "${ingredients}"

Mark which ingredients they probably DON'T have (label them isYouMightNeed = true). Mark what they DO have (isYouMightNeed = false). Keep the list realistic — most home kitchens have salt, pepper, oil, butter.

Return STRICT JSON, no markdown, no commentary:

{
  "intro": "1 short, enthusiastic sentence in Mustafo's voice",
  "ingredients": [
    {
      "name": "string",
      "quantity": "string (e.g. '2', '1/2', 'to taste')",
      "unit": "string (e.g. 'cup', 'tbsp', 'cloves', '')",
      "isYouMightNeed": boolean
    }
  ],
  "instructions": [
    "string (one step, 1-2 sentences, casual tone, no jargon)"
  ],
  "celebration": "1-2 sentences celebrating them at the end, Mustafo voice"
}

Rules:
- 7 to 10 instruction steps max
- Simple verbs (chop, stir, sauté) — never jargon (brunoise, deglaze)
- Be encouraging at key moments
- Each instruction stands on its own (no "in step 2..." references)`;

export type RecipeResult =
  | { kind: "ok"; recipe: Recipe }
  | { kind: "error"; message: string };

export async function generateRecipe(
  dishName: string,
  ingredients: string,
): Promise<RecipeResult> {
  try {
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: MUSTAFO_SYSTEM_PROMPT },
        { role: "user", content: RECIPE_PROMPT(dishName, ingredients) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<Recipe>;

    const recipe: Recipe = {
      intro: String(parsed.intro ?? "You got this. Let's go."),
      ingredients: Array.isArray(parsed.ingredients)
        ? parsed.ingredients.map((i) => ({
            name: String(i?.name ?? ""),
            quantity: String(i?.quantity ?? ""),
            unit: String(i?.unit ?? ""),
            isYouMightNeed: Boolean(i?.isYouMightNeed),
          }))
        : [],
      instructions: Array.isArray(parsed.instructions)
        ? parsed.instructions.map(String)
        : [],
      celebration: String(
        parsed.celebration ?? "You just made something delicious. Be proud.",
      ),
    };

    if (recipe.ingredients.length === 0 || recipe.instructions.length === 0) {
      return { kind: "error", message: "Recipe came back empty. Try again?" };
    }
    return { kind: "ok", recipe };
  } catch (err) {
    console.error("generateRecipe error", err);
    return {
      kind: "error",
      message:
        "Mustafo dropped the recipe. Give it another shot? (Check your OPENAI_API_KEY.)",
    };
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/ai.server.ts
git commit -m "feat(ai): extract generateRecipe from api route"
```

---

### Task 13: Add loader + action to `_app._index.tsx`

**Files:**
- Modify: `app/routes/_app._index.tsx`

- [ ] **Step 1: Add the server-side exports**

At the top of `app/routes/_app._index.tsx`, after the existing imports, add the new imports and the loader/action exports. Insert this block immediately after the existing import lines:

```tsx
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";

import {
  generateMealSuggestions,
  type SuggestionsResult,
} from "~/lib/ai.server";
import { consumeFlash, flash } from "~/lib/session.server";
import type { MealSuggestion } from "~/types";

type CookData = {
  suggestions: MealSuggestion[];
  submittedIngredients: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { value, headers } = await consumeFlash<CookData>(request, "cookData");
  return json(
    {
      suggestions: value?.suggestions ?? null,
      submittedIngredients: value?.submittedIngredients ?? "",
    },
    { headers },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const ingredients = String(form.get("ingredients") ?? "").trim();
  if (!ingredients) {
    return json({ error: "Tell me what's in there." }, { status: 400 });
  }
  const result: SuggestionsResult = await generateMealSuggestions(ingredients);
  if (result.kind === "no-food") {
    return json({ error: result.message }, { status: 400 });
  }
  if (result.kind === "error") {
    return json({ error: result.message }, { status: 500 });
  }
  const headers = await flash<CookData>(request, "cookData", {
    suggestions: result.suggestions,
    submittedIngredients: ingredients,
  });
  return redirect("/", { headers });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors. The route now has `loader` and `action` exports alongside the existing default export, which is fine — the existing UI still works via the old `fetch()` calls for now.

- [ ] **Step 3: Commit**

```bash
git add app/routes/_app._index.tsx
git commit -m "feat(cook): add loader and action for suggest-meals flow"
```

---

### Task 14: Refactor `CookInner` to read from loader and submit via Form

**Files:**
- Modify: `app/routes/_app._index.tsx`

- [ ] **Step 1: Update the imports**

In `app/routes/_app._index.tsx`, at the top:

Replace:
```tsx
import { useNavigate } from "@remix-run/react";
```

With:
```tsx
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
```

- [ ] **Step 2: Replace the `handleSubmit` and stage-management code in `CookInner`**

Inside `CookInner` (the component, not `CookRoute`), find this block at the top (lines ~25–73 of the original):

```tsx
function CookInner({ profile }: { profile: UserProfile }) {
  const { notify } = useToast();
  const [ingredients, setIngredients] = useState("");
  const [submittedIngredients, setSubmittedIngredients] = useState("");
  const [stage, setStage] = useState<Stage>("chat");
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealSuggestion | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadingMode, setLoadingMode] = useState<"none" | "meals" | "recipe">(
    "none",
  );
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const value = ingredients.trim();
    if (!value || loadingMode !== "none") return;
    setError(null);
    setSubmittedIngredients(value);
    setLoadingMode("meals");
    try {
      const res = await fetch("/api/suggest-meals", {
        // ... existing fetch logic ...
```

Replace the state initialization and `handleSubmit` with:

```tsx
function CookInner({ profile }: { profile: UserProfile }) {
  const { notify } = useToast();
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const suggestions = loaderData.suggestions;
  const submittedIngredients = loaderData.submittedIngredients;

  const [ingredients, setIngredients] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<MealSuggestion | null>(
    null,
  );
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const isSuggesting =
    navigation.state === "submitting" &&
    navigation.formMethod === "POST" &&
    navigation.formAction === "/";
  const isFetchingRecipe =
    navigation.state === "submitting" &&
    navigation.formAction === "/cook/recipe";

  const stage: Stage = recipe
    ? "recipe"
    : suggestions && suggestions.length > 0
      ? "suggestions"
      : "chat";

  const errorMessage = actionData && "error" in actionData
    ? actionData.error
    : null;

  useEffect(() => {
    if (errorMessage) notify(errorMessage, "error");
  }, [errorMessage, notify]);

  useEffect(() => {
    if (stage !== "chat") {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    }
  }, [stage]);
```

- [ ] **Step 3: Delete the old `handleSubmit` and `pickMeal` `fetch` calls**

Delete:
- The `async function handleSubmit(e?: React.FormEvent) { ... }` block (the one with `fetch("/api/suggest-meals", ...)`).
- The `async function pickMeal(meal: MealSuggestion) { ... }` block. **Note:** PR2 Task 15 reintroduces meal selection as a Form. Until then, keep a placeholder:

```tsx
function pickMeal(_meal: MealSuggestion) {
  // Replaced by <Form action="/cook/recipe"> in Task 15.
}
```

- Delete `function tryElse()` — Task 16 reintroduces it via navigation.

For the in-flow `makingIt` function: keep it for now. It already redirects to `/profile`. We'll revisit it in Task 16.

- [ ] **Step 4: Replace the form element**

In `CookInner`'s JSX, find the form (~line 167):

```tsx
<form
  onSubmit={handleSubmit}
  className="card-base p-5 md:p-6 relative overflow-hidden"
>
```

Replace with:

```tsx
<Form
  method="post"
  action="/"
  className="card-base p-5 md:p-6 relative overflow-hidden"
>
```

Find the closing `</form>` and replace with `</Form>`.

The `<textarea>` inside the form must have `name="ingredients"`:

```tsx
<textarea
  name="ingredients"
  value={ingredients}
  onChange={(e) => setIngredients(e.target.value)}
  ...
/>
```

(Add `name="ingredients"` if not already present.)

The submit button no longer needs custom disabled logic beyond the textarea being empty:

```tsx
<button
  type="submit"
  disabled={!ingredients.trim() || isSuggesting}
  className="btn-primary"
>
```

Remove the `onKeyDown` handler that calls `handleSubmit` — the native form submit handles Enter:

```tsx
onKeyDown={(e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    // Let the form submit naturally — remove the void handleSubmit() call.
  }
}}
```

Actually simpler: delete the entire `onKeyDown` prop. The native form will not submit on Enter inside a textarea by default. To preserve the current behavior (Enter submits, Shift+Enter newline), replace with:

```tsx
onKeyDown={(e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    e.currentTarget.form?.requestSubmit();
  }
}}
```

- [ ] **Step 5: Replace the `LoadingOverlay`'s `open` prop**

Find (near the bottom of `CookInner`'s JSX, line ~290):

```tsx
<LoadingOverlay
  open={loadingMode !== "none"}
  messages={loadingMode === "recipe" ? RECIPE_LOADING : LOADING_MESSAGES}
/>
```

Replace with:

```tsx
<LoadingOverlay
  open={isSuggesting || isFetchingRecipe}
  messages={isFetchingRecipe ? RECIPE_LOADING : LOADING_MESSAGES}
/>
```

- [ ] **Step 6: Find and remove the inline `error` rendering tied to local state**

Find:
```tsx
{error && (
  <motion.p ...>{error}</motion.p>
)}
```

Replace `error` with `errorMessage`:

```tsx
{errorMessage && (
  <motion.p
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-4 text-coral text-sm font-body text-center"
  >
    {errorMessage}
  </motion.p>
)}
```

- [ ] **Step 7: Verify typecheck**

Run: `npm run typecheck`
Expected: errors — the file still references old state like `setSuggestions`, `setStage`, `setLoadingMode`, `setError`. Search for them and delete the lines that call them (most live in the old `handleSubmit`/`pickMeal`/`tryElse` you have already deleted; any stragglers should be cleaned up).

Re-run: `npm run typecheck`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add app/routes/_app._index.tsx
git commit -m "refactor(cook): drive suggestions stage from loader + Form"
```

---

### Task 15: Convert meal selection to a Form

**Files:**
- Modify: `app/components/MealSuggestionCard.tsx`
- Modify: `app/routes/_app._index.tsx`

- [ ] **Step 1: Read the current `MealSuggestionCard`**

```bash
cat app/components/MealSuggestionCard.tsx
```

Note its `onSelect` prop and how it is used. Plan to replace `onSelect` with a `submittedIngredients` prop, so the card can render its own `<Form>`.

- [ ] **Step 2: Update `MealSuggestionCard`**

Open `app/components/MealSuggestionCard.tsx`. Find the props type — it has at least `meal`, `index`, `onSelect`. Replace the `onSelect` prop with `submittedIngredients`.

Replace the file with (preserve existing markup/styling — only the click target changes from a button-with-handler to a Form):

```tsx
import { Form } from "@remix-run/react";
import { motion } from "motion/react";
import type { MealSuggestion } from "~/types";

type Props = {
  meal: MealSuggestion;
  index: number;
  submittedIngredients: string;
};

export function MealSuggestionCard({
  meal,
  index,
  submittedIngredients,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 220, damping: 22 }}
    >
      <Form method="post" action="/cook/recipe">
        <input type="hidden" name="dishName" value={meal.name} />
        <input
          type="hidden"
          name="ingredients"
          value={submittedIngredients}
        />
        <input
          type="hidden"
          name="imageUrl"
          value={meal.imageUrl ?? ""}
        />
        <button
          type="submit"
          className="card-base p-4 w-full text-left flex flex-col gap-3 group hover:-translate-y-1 transition-transform"
        >
          <div className="w-full aspect-[4/3] rounded-[14px] overflow-hidden bg-gradient-to-br from-fresh/30 to-sunny/30 grid place-items-center">
            {meal.imageUrl ? (
              <img
                src={meal.imageUrl}
                alt={meal.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-5xl">{meal.emoji}</span>
            )}
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink leading-tight group-hover:text-fresh transition-colors">
              {meal.name}
            </h3>
            <p className="font-body text-xs text-muted mt-1">
              {meal.likelihood}% match
            </p>
            <p className="font-body text-sm text-ink mt-2">{meal.why}</p>
          </div>
        </button>
      </Form>
    </motion.div>
  );
}
```

If the current file has different/more elaborate markup than this, preserve the original markup and replace ONLY the outer click handler / button. The contract change is `onSelect: () => void` → `submittedIngredients: string`.

- [ ] **Step 3: Update the call site in `_app._index.tsx`**

Find the `<MealSuggestionCard>` usage in `_app._index.tsx`:

```tsx
<MealSuggestionCard
  key={m.name + i}
  meal={m}
  index={i}
  onSelect={() => pickMeal(m)}
/>
```

Replace with:

```tsx
<MealSuggestionCard
  key={m.name + i}
  meal={m}
  index={i}
  submittedIngredients={submittedIngredients}
/>
```

Delete the placeholder `function pickMeal()` if no other reference remains.

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add app/components/MealSuggestionCard.tsx app/routes/_app._index.tsx
git commit -m "refactor(cook): pick a meal via Form submission to /cook/recipe"
```

---

### Task 16: Create `_app.cook.recipe.tsx` route

**Files:**
- Create: `app/routes/_app.cook.recipe.tsx`

- [ ] **Step 1: Create the file**

```tsx
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useLoaderData, useNavigate } from "@remix-run/react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

import { RecipeView } from "~/components/RecipeView";
import { useToast } from "~/components/Toast";
import { generateRecipe } from "~/lib/ai.server";
import { addDish } from "~/lib/dishes.client";
import { consumeFlash, flash } from "~/lib/session.server";
import type { Dish, MealSuggestion, Recipe } from "~/types";

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
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/routes/_app.cook.recipe.tsx
git commit -m "feat(routes): add /cook/recipe form action + loader"
```

---

### Task 17: Remove residual in-flow recipe code from `_app._index.tsx`

**Files:**
- Modify: `app/routes/_app._index.tsx`

- [ ] **Step 1: Drop the now-unused `recipe` state and JSX**

In `app/routes/_app._index.tsx`:

- Delete `const [selectedMeal, setSelectedMeal] = useState<MealSuggestion | null>(null);`
- Delete `const [recipe, setRecipe] = useState<Recipe | null>(null);`
- Update the stage derivation:
  ```tsx
  const stage: Stage = suggestions && suggestions.length > 0 ? "suggestions" : "chat";
  ```
  (Drop the `"recipe"` branch entirely — recipe lives at `/cook/recipe` now.)
- Delete the `{stage === "recipe" && ...}` JSX branch inside the `<AnimatePresence mode="wait">` block.
- Delete the `makingIt` function and the `tryElse` function from `CookInner`.
- Remove the now-unused `RECIPE_LOADING` constant declaration at the top of the file.
- Remove the now-unused `RecipeView`, `addDish`, `uuid`, and `Recipe` imports.

- [ ] **Step 2: Update the `Stage` type**

Find:
```tsx
type Stage = "chat" | "suggestions" | "recipe";
```

Replace with:
```tsx
type Stage = "chat" | "suggestions";
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: clean. If `LoadingOverlay`'s `messages` prop references `RECIPE_LOADING`, simplify it:

```tsx
<LoadingOverlay
  open={isSuggesting || isFetchingRecipe}
  messages={
    isFetchingRecipe
      ? [
          "Pulling together the recipe...",
          "Measuring with vibes only...",
          "Adding the secret step...",
          "Almost there, chef...",
        ]
      : LOADING_MESSAGES
  }
/>
```

- [ ] **Step 4: Commit**

```bash
git add app/routes/_app._index.tsx
git commit -m "refactor(cook): drop in-flow recipe stage; routed to /cook/recipe"
```

---

### Task 18: Delete the API routes that are now in actions

**Files:**
- Delete: `app/routes/api.suggest-meals.ts`
- Delete: `app/routes/api.get-recipe.ts`

- [ ] **Step 1: Confirm no remaining references**

```bash
grep -rn "/api/suggest-meals" app/
grep -rn "/api/get-recipe" app/
```
Expected: no matches. If any references remain (e.g., in `CookInner`), they were missed in Tasks 14–17 — fix them first.

- [ ] **Step 2: Delete the files**

```bash
git rm app/routes/api.suggest-meals.ts app/routes/api.get-recipe.ts
```

- [ ] **Step 3: Verify typecheck and build**

```bash
npm run typecheck
npm run build
```
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(api): remove suggest-meals + get-recipe routes (logic moved to actions)"
```

---

### Task 19: Smoke-test PR2

**Files:** None (verification only)

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Run the full cook flow**

In a logged-in browser session:

1. Visit `/`. Expect the chat stage.
2. Type "chicken, garlic, pasta" → submit (click or Enter). Expect the loading overlay, then 3 meal cards.
3. Right-click → "Inspect" on the form. Confirm `method="post"` and `action="/"`.
4. Pick a meal. Expect navigation to `/cook/recipe` (URL changes). Recipe renders.
5. Click "I'm making it". Expect navigation to `/profile` with the new dish.
6. Refresh `/cook/recipe` directly (use browser refresh). Expect: redirect to `/` (because flash was already consumed). This is the documented behavior.
7. Browser back button from `/profile` → returns to `/cook/recipe` (likely redirects to `/`), then back again → returns to `/`. Forward/back navigation is sane.

- [ ] **Step 3: Test error paths**

1. Type only non-food: "rocks, electricity, soap" → submit. Expect a toast error and the chat stage stays visible (no redirect to suggestions stage).
2. Test JS-disabled mode: in DevTools, open settings → disable JavaScript → reload `/`. Submit the form with ingredients. Expect: the page reloads showing suggestions (server-rendered). This proves the form works without JS.

- [ ] **Step 4: Confirm `useNavigation` drives the overlay**

While the suggestions are loading (after submit, before redirect), the `LoadingOverlay` should appear. Inspect the React tree if needed — `loadingMode` state should no longer exist in `CookInner`.

- [ ] **Step 5: Push and open PR2**

```bash
git push -u origin refactor/pr2-form-actions
```

Open PR2 titled: `Refactor: form-driven cook flow + useNavigation (PR2 of 3)`. Body references the spec.

**Stop here. Get PR2 reviewed and merged before starting PR3.**

---

# PR3 — `defer()` streaming for the recipe

**Branch:** `refactor/pr3-streaming-recipe`

**Goal:** The recipe loader returns `defer()` with three sequential structured-output OpenAI calls (title → ingredients → steps). The UI uses `<Suspense>` + `<Await>` to show each chunk as it streams in. Total wall-clock time within ±20% of today's single call; title visible at ~600–1000ms.

**Prerequisite:** PR2 is merged to `main`.

---

### Task 20: Branch off main and split `generateRecipe` into three calls

**Files:**
- Modify: `app/lib/ai.server.ts`

- [ ] **Step 1: Branch**

```bash
git checkout main
git pull --ff-only
git checkout -b refactor/pr3-streaming-recipe
```

- [ ] **Step 2: Add three new generation functions to `ai.server.ts`**

Append to `app/lib/ai.server.ts` (do NOT delete the existing `generateRecipe` — Task 22 removes it):

```ts
// ---------- PR3 streaming variants ----------

const TITLE_PROMPT = (dish: string, ingredients: string) => `Recipe for: "${dish}"
Available ingredients from user: "${ingredients}"

Return STRICT JSON, no markdown:

{
  "title": "string — the dish title as you'd write it on a recipe card. Can refine the user's phrasing (e.g. 'Garlic Pasta' -> 'Garlicky One-Pan Spaghetti'). 2-5 words.",
  "intro": "1 short, enthusiastic sentence in Mustafo's voice"
}`;

export type RecipeTitle = { title: string; intro: string };

export async function generateRecipeTitle(
  dishName: string,
  ingredients: string,
): Promise<RecipeTitle> {
  const client = getOpenAI();
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      { role: "system", content: MUSTAFO_SYSTEM_PROMPT },
      { role: "user", content: TITLE_PROMPT(dishName, ingredients) },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<RecipeTitle>;
  return {
    title: String(parsed.title ?? dishName),
    intro: String(parsed.intro ?? "You got this. Let's go."),
  };
}

const INGREDIENTS_PROMPT = (
  title: string,
  dish: string,
  ingredients: string,
) => `Recipe title: "${title}"
Originally asked: "${dish}"
User's available ingredients: "${ingredients}"

Mark which ingredients they probably DON'T have (label them isYouMightNeed = true). Mark what they DO have (isYouMightNeed = false). Keep the list realistic — most home kitchens have salt, pepper, oil, butter.

Return STRICT JSON, no markdown:

{
  "ingredients": [
    {
      "name": "string",
      "quantity": "string (e.g. '2', '1/2', 'to taste')",
      "unit": "string (e.g. 'cup', 'tbsp', 'cloves', '')",
      "isYouMightNeed": boolean
    }
  ]
}`;

import type { RecipeIngredient } from "~/types";

export type RecipeIngredients = { ingredients: RecipeIngredient[] };

export async function generateRecipeIngredients(
  title: string,
  dishName: string,
  ingredients: string,
): Promise<RecipeIngredients> {
  const client = getOpenAI();
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.5,
    messages: [
      { role: "system", content: MUSTAFO_SYSTEM_PROMPT },
      {
        role: "user",
        content: INGREDIENTS_PROMPT(title, dishName, ingredients),
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<RecipeIngredients>;
  const list = Array.isArray(parsed.ingredients)
    ? parsed.ingredients.map((i) => ({
        name: String(i?.name ?? ""),
        quantity: String(i?.quantity ?? ""),
        unit: String(i?.unit ?? ""),
        isYouMightNeed: Boolean(i?.isYouMightNeed),
      }))
    : [];
  return { ingredients: list };
}

const STEPS_PROMPT = (
  title: string,
  ingredientList: RecipeIngredient[],
) => `Recipe title: "${title}"
Ingredients (in order):
${ingredientList.map((i) => `- ${i.quantity} ${i.unit} ${i.name}${i.isYouMightNeed ? " (might need)" : ""}`).join("\n")}

Return STRICT JSON, no markdown:

{
  "instructions": [
    "string — one step, 1-2 sentences, casual tone, no jargon, simple verbs"
  ],
  "celebration": "1-2 sentences celebrating them at the end, Mustafo voice"
}

Rules:
- 7 to 10 instruction steps max
- Simple verbs (chop, stir, sauté) — never jargon (brunoise, deglaze)
- Each step stands on its own (no 'in step 2...' references)`;

export type RecipeSteps = { instructions: string[]; celebration: string };

export async function generateRecipeSteps(
  title: string,
  ingredientList: RecipeIngredient[],
): Promise<RecipeSteps> {
  const client = getOpenAI();
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      { role: "system", content: MUSTAFO_SYSTEM_PROMPT },
      { role: "user", content: STEPS_PROMPT(title, ingredientList) },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<RecipeSteps>;
  return {
    instructions: Array.isArray(parsed.instructions)
      ? parsed.instructions.map(String)
      : [],
    celebration: String(
      parsed.celebration ?? "You just made something delicious. Be proud.",
    ),
  };
}
```

Note the `import type { RecipeIngredient }` line — it must be at the top of the file with the other imports. Move it up there.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/lib/ai.server.ts
git commit -m "feat(ai): add three-step recipe generation for streaming"
```

---

### Task 21: Create recipe skeleton components

**Files:**
- Create: `app/components/RecipeSkeleton.tsx`

- [ ] **Step 1: Create the skeletons**

```tsx
export function TitleSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-10 bg-soft rounded w-2/3" />
      <div className="h-4 bg-soft rounded w-5/6" />
    </div>
  );
}

export function IngredientsSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-5 bg-soft rounded w-1/3 mb-3" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-4 bg-soft rounded" style={{ width: `${65 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

export function StepsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 bg-soft rounded w-1/4 mb-3" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-soft flex-shrink-0" />
          <div className="flex-1 h-4 bg-soft rounded" style={{ width: `${75 + (i % 4) * 5}%` }} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/components/RecipeSkeleton.tsx
git commit -m "feat(components): add recipe streaming skeletons"
```

---

### Task 22: Refactor `_app.cook.recipe.tsx` loader to use `defer()`

**Files:**
- Modify: `app/routes/_app.cook.recipe.tsx`

- [ ] **Step 1: Rewrite the loader**

In `app/routes/_app.cook.recipe.tsx`, replace the existing `loader` and the imports from `~/lib/ai.server`:

Replace the import line:
```ts
import { generateRecipe } from "~/lib/ai.server";
```

With:
```ts
import {
  generateRecipeIngredients,
  generateRecipeSteps,
  generateRecipeTitle,
} from "~/lib/ai.server";
```

Also add `defer` to the `@remix-run/node` import:
```ts
import {
  defer,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
```

Remove the `json` import if no longer used.

Replace the existing `loader` with:

```ts
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
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: errors in the route's default export (it still references `recipe` from `useLoaderData`). Task 23 fixes that.

- [ ] **Step 3: Commit**

```bash
git add app/routes/_app.cook.recipe.tsx
git commit -m "feat(recipe): switch loader to defer() with three streaming promises"
```

---

### Task 23: Refactor recipe view to use `<Suspense>` + `<Await>`

**Files:**
- Modify: `app/routes/_app.cook.recipe.tsx`

- [ ] **Step 1: Update imports**

Add to imports:
```tsx
import { Await } from "@remix-run/react";
import { Suspense } from "react";
import {
  IngredientsSkeleton,
  StepsSkeleton,
  TitleSkeleton,
} from "~/components/RecipeSkeleton";
import type {
  RecipeIngredients,
  RecipeSteps,
  RecipeTitle,
} from "~/lib/ai.server";
```

Remove the unused `RecipeView` import (we render the recipe directly here now) and the unused `motion`, `MealSuggestion`, `Recipe` imports.

- [ ] **Step 2: Replace the default-export component**

Replace `CookRecipeRoute` entirely:

```tsx
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
          <Await resolve={Promise.all([titlePromise, ingredientsPromise, stepsPromise])}>
            {([t, ing, s]: [RecipeTitle, RecipeIngredients, RecipeSteps]) => (
              <RecipeFooter
                dishTitle={t.title}
                ingredients={ing.ingredients}
                instructions={s.instructions}
                celebration={s.celebration}
                imageUrl={job.imageUrl}
                originalIngredients={job.ingredients}
                onTryElse={tryElse}
                onSaved={(name) => notify(`Saved ${name}. Go cook, chef!`, "success")}
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
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/routes/_app.cook.recipe.tsx
git commit -m "feat(recipe): render with Suspense + Await for streaming sections"
```

---

### Task 24: Remove the now-unused `generateRecipe`

**Files:**
- Modify: `app/lib/ai.server.ts`

- [ ] **Step 1: Confirm no remaining callers**

```bash
grep -rn "generateRecipe[^A-Za-z]" app/
```
Expected output: only the three new functions (`generateRecipeTitle`, `generateRecipeIngredients`, `generateRecipeSteps`) and the new function definitions. No bare `generateRecipe(` calls.

- [ ] **Step 2: Delete the legacy `generateRecipe` function and `RECIPE_PROMPT` constant**

In `app/lib/ai.server.ts`, delete:
- `const RECIPE_PROMPT = ...`
- `export type RecipeResult = ...`
- `export async function generateRecipe(...) { ... }`

Also remove the now-unused `Recipe` type import if no other file in `ai.server.ts` uses it (the three new functions don't construct a `Recipe` directly — only `RecipeTitle`, `RecipeIngredients`, `RecipeSteps`).

- [ ] **Step 3: Verify typecheck and build**

```bash
npm run typecheck
npm run build
```
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add app/lib/ai.server.ts
git commit -m "chore(ai): remove legacy single-call generateRecipe"
```

---

### Task 25: Smoke-test PR3

**Files:** None (verification only)

- [ ] **Step 1: Dev server**

```bash
npm run dev
```

- [ ] **Step 2: Time the streaming**

Open DevTools → Network tab → set Throttling to "No throttling" (default).

1. Visit `/`. Type ingredients. Submit. Pick a meal.
2. The URL changes to `/cook/recipe`. The page should begin rendering BEFORE the full recipe is generated:
   - The cover image (if any) and the title skeleton appear nearly immediately.
   - At ~600–1200ms the title resolves and renders.
   - At ~1.5–2.5s the ingredients list resolves.
   - At ~3–5s the steps and footer resolve.

If everything appears at once after ~4s, the streaming is not working. Check:
- The loader returns `defer()`, not `json()`.
- `@vercel/remix` is in dependencies (it is, per `package.json`).
- The dev server output shows the response streaming (look for chunked-transfer headers in Network → Response Headers).

- [ ] **Step 3: Error fallback test**

Temporarily make `generateRecipeIngredients` throw:

```ts
export async function generateRecipeIngredients(...) {
  throw new Error("forced for testing");
}
```

Re-run the cook flow. Expect:
- Title resolves normally.
- Ingredients section shows the red error box.
- Steps section also shows an error (because `stepsPromise` awaits `ingredientsPromise`).
- Page does not crash.

Revert the throw before committing.

- [ ] **Step 4: Verify "I'm making it" still works**

Pick a meal → wait for full streaming → click "I'm making it". Land on `/profile`. The new dish should appear. The dish's title should be the streamed title (possibly refined from the originally-picked dishName), not the original `meal.name`. This is intentional.

- [ ] **Step 5: Push and open PR3**

```bash
git push -u origin refactor/pr3-streaming-recipe
```

Open PR3 titled: `Refactor: streaming recipe with defer() (PR3 of 3)`. Body references the spec.

---

## Final acceptance verification (all PRs merged)

After all three PRs are on `main`:

- [ ] **Smoke 1: New user end-to-end**

Fresh browser session → `/` → `/onboarding` → complete two steps → `/`. Greeting populated. Submit ingredients → meals appear → pick one → recipe streams in (title first, then ingredients, then steps) → "I'm making it" → `/profile` → new dish at top.

- [ ] **Smoke 2: Returning user**

Re-open browser. Visit `/`. Cook page renders fully on first paint. View source: greeting is in the server-rendered HTML.

- [ ] **Smoke 3: Migration**

In a fresh incognito window: set `localStorage.setItem("igotthis_profile", JSON.stringify({...}))`, then visit `/onboarding`. Silent migration runs, redirects to `/`. `localStorage["igotthis_profile"]` is gone; cookie is set.

- [ ] **Smoke 4: Saved-dish deep link**

From `/profile`, click any dish. URL changes to `/recipe/<dishId>`. Recipe renders. Back button returns to `/profile` with the dish still present and rating preserved.

- [ ] **Smoke 5: Onboarding redirect**

Logged-in user visits `/onboarding`. Server-side redirect to `/`.

- [ ] **Smoke 6: Delete-account**

`/profile` → "Delete account & start fresh" → confirm → `/onboarding`. Cookie cleared, dishes cleared, `localStorage["igotthis_dishes"]` empty.

- [ ] **Smoke 7: No leftover client-only profile loading**

```bash
grep -rn "getProfile" app/routes app/components
```
Expected: only references to `~/lib/session.server`'s `getProfile`. No localStorage reads for profile anywhere in `app/routes` or `app/components`.

- [ ] **Smoke 8: No leftover state machine**

```bash
grep -rn "loadingMode\|stage.*useState\|setLoadingMode" app/routes
```
Expected: no matches.

- [ ] **Smoke 9: Type & build**

```bash
npm run typecheck
npm run build
```
Expected: both succeed on `main` after all three PRs.

- [ ] **Smoke 10: Lint**

```bash
npm run lint
```
Expected: passes (or no new violations vs. pre-refactor `main`).
