import { createCookieSessionStorage, redirect } from "@remix-run/node";
import type { MealSuggestion, UserProfile } from "~/types";

export type CookState = {
  suggestions: MealSuggestion[];
  submittedIngredients: string;
  // Bumps on every new submission. Scopes the client-side recipe cache so a
  // fresh "Find me something" run doesn't inherit stale recipes from the
  // previous batch (cache key includes this id).
  generationId: string;
};

// Encode/decode CookState as ASCII-safe base64 so multibyte chars (emoji)
// survive the cookie round-trip. Without this, emojis come back as mojibake
// (UTF-8 bytes decoded as Latin-1). CookState is write-once: only the cook
// action sets it. viewedIndices is intentionally not in here — the cookie
// would grow on every meal click and tip past the 4KB browser limit.
export function encodeCookState(state: CookState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64");
}

export function decodeCookState(encoded: string): CookState | null {
  try {
    const raw = JSON.parse(
      Buffer.from(encoded, "base64").toString("utf8"),
    ) as Partial<CookState>;
    return {
      suggestions: raw.suggestions ?? [],
      submittedIngredients: raw.submittedIngredients ?? "",
      generationId: raw.generationId ?? "",
    };
  } catch {
    return null;
  }
}

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error(
    "SESSION_SECRET is not set. Add it to .env (see .env.example).",
  );
}

type SessionData = {
  profile: UserProfile;
  cookState: string; // base64-encoded CookState — see encode/decodeCookState
};

type SessionFlash = {
  [key: string]: unknown;
};

export const storage = createCookieSessionStorage<SessionData, SessionFlash>({
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

/**
 * Commits a session safely. If the resulting cookie exceeds the safe browser
 * limit (~4KB) or commitSession throws, drops `cookState` and retries. As a
 * last resort returns null so the caller can skip setting the cookie.
 *
 * This prevents Vercel from 500-ing on oversized Set-Cookie responses.
 */
export async function commitSessionSafely(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any,
): Promise<string | null> {
  const SAFE_LIMIT = 3800;
  try {
    const cookie = await storage.commitSession(session);
    if (cookie.length <= SAFE_LIMIT) return cookie;
  } catch {
    // fall through to retry without cookState
  }
  try {
    session.unset("cookState");
    const cookie = await storage.commitSession(session);
    if (cookie.length <= SAFE_LIMIT) return cookie;
  } catch {
    // fall through
  }
  return null;
}

export async function getProfile(
  request: Request,
): Promise<UserProfile | null> {
  const session = await getSession(request);
  return (session.get("profile") as UserProfile | undefined) ?? null;
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

export async function consumeFlash<T>(
  request: Request,
  key: string,
): Promise<{ value: T | undefined; headers: Headers }> {
  const session = await getSession(request);
  const value = session.get(key) as T | undefined;
  const cookie = await commitSessionSafely(session);
  const headers = new Headers();
  if (cookie) headers.append("Set-Cookie", cookie);
  return { value, headers };
}
