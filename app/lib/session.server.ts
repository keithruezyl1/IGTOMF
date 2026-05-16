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
