import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { getOpenAI, MUSTAFO_SYSTEM_PROMPT } from "~/lib/openai.server";
import type { Recipe } from "~/types";

const PROMPT = (dish: string, ingredients: string) => `Recipe for: "${dish}"
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

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = (await request.json().catch(() => null)) as
    | { dishName?: string; ingredients?: string }
    | null;
  const dishName = body?.dishName?.trim();
  const ingredients = body?.ingredients?.trim() ?? "";
  if (!dishName) {
    return json({ error: "Missing dish name." }, { status: 400 });
  }

  try {
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: MUSTAFO_SYSTEM_PROMPT },
        { role: "user", content: PROMPT(dishName, ingredients) },
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
      celebration: String(parsed.celebration ?? "You just made something delicious. Be proud."),
    };

    if (recipe.ingredients.length === 0 || recipe.instructions.length === 0) {
      return json({ error: "Recipe came back empty. Try again?" }, { status: 502 });
    }

    return json({ recipe });
  } catch (err) {
    console.error("get-recipe error", err);
    return json(
      {
        error:
          "Mustafo dropped the recipe. Give it another shot? (Check your OPENAI_API_KEY.)",
      },
      { status: 500 },
    );
  }
}
