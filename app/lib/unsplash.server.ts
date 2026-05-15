export async function searchUnsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", `${query} food`);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${key}`,
        "Accept-Version": "v1",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ urls?: { regular?: string; small?: string } }>;
    };
    const hit = data.results?.[0];
    return hit?.urls?.regular ?? hit?.urls?.small ?? null;
  } catch {
    return null;
  }
}
