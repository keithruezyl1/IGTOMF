import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { searchUnsplashImage } from "~/lib/unsplash.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const query = body?.query?.trim();
  if (!query) return json({ url: null });
  const url = await searchUnsplashImage(query);
  return json({ url });
}
