import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { getOpenAI, MUSTAFO_SYSTEM_PROMPT } from "~/lib/openai.server";
import { searchUnsplashImage } from "~/lib/unsplash.server";
import type { MealSuggestion } from "~/types";

const PROMPT = (ingredients: string) => `A user wrote: "${ingredients}"

Pick out the usable ingredients (skip ones that sound spoiled, expired, or unsafe — joke about them briefly). Then suggest 3 meal ideas they can realistically make.

Return STRICT JSON in this exact shape — no markdown, no commentary:

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

Exactly 3 suggestions. Different cuisines / styles when possible.`;

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = (await request.json().catch(() => null)) as
    | { ingredients?: string }
    | null;
  const ingredients = body?.ingredients?.trim();
  if (!ingredients) {
    return json({ error: "Tell me what's in your fridge first." }, { status: 400 });
  }

  try {
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.85,
      messages: [
        { role: "system", content: MUSTAFO_SYSTEM_PROMPT },
        { role: "user", content: PROMPT(ingredients) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      suggestions?: Array<Omit<MealSuggestion, "imageUrl" | "description">>;
    };

    const suggestions = (parsed.suggestions ?? []).slice(0, 3).map((s) => ({
      name: String(s.name ?? "Mystery Meal"),
      emoji: String(s.emoji ?? "🍳"),
      why: String(s.why ?? ""),
      description: String(s.why ?? ""),
      likelihood: Math.max(60, Math.min(99, Number(s.likelihood) || 85)),
    })) as MealSuggestion[];

    if (suggestions.length === 0) {
      return json(
        { error: "Mustafo blanked. Try rewording your ingredients?" },
        { status: 502 },
      );
    }

    const withImages = await Promise.all(
      suggestions.map(async (s) => ({
        ...s,
        imageUrl: await searchUnsplashImage(s.name),
      })),
    );

    return json({ suggestions: withImages });
  } catch (err) {
    console.error("suggest-meals error", err);
    return json(
      {
        error:
          "Mustafo's pan caught fire. Try again in a sec? (Check your OPENAI_API_KEY is set.)",
      },
      { status: 500 },
    );
  }
}
