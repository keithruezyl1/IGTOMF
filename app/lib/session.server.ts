import { createCookieSessionStorage, redirect } from "@remix-run/node";
import type {
  MealSuggestion,
  RecipeIngredient,
  UserProfile,
} from "~/types";

export type CachedRecipe = {
  title: string;
  intro: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  celebration: string;
};

export type CookState = {
  suggestions: MealSuggestion[];
  submittedIngredients: string;
  viewedIndices: number[];
  recipes: Record<string, CachedRecipe>;
  recipeOrder: number[]; // LRU insertion order, capped at RECIPE_CACHE_LIMIT
};

// Cookies cap at ~4KB. Each cached recipe is ~1-2KB. We keep only the most
// recently-viewed N so the cookie can never overflow.
export const RECIPE_CACHE_LIMIT = 2;

export function cacheRecipe(
  state: CookState,
  index: number,
  recipe: CachedRecipe,
): CookState {
  const recipes = { ...state.recipes, [String(index)]: recipe };
  const order = state.recipeOrder.filter((i) => i !== index).concat(index);
  while (order.length > RECIPE_CACHE_LIMIT) {
    const evict = order.shift();
    if (evict !== undefined) delete recipes[String(evict)];
  }
  return { ...state, recipes, recipeOrder: order };
}

// Encode/decode CookState as ASCII-safe base64 so multibyte chars (emoji)
// survive the cookie round-trip. Without this, emojis come back as mojibake
// (UTF-8 bytes decoded as Latin-1).
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
      viewedIndices: raw.viewedIndices ?? [],
      recipes: raw.recipes ?? {},
      recipeOrder: raw.recipeOrder ?? [],
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
  const cookie = await storage.commitSession(session);
  const headers = new Headers();
  headers.append("Set-Cookie", cookie);
  return { value, headers };
}
