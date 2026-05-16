import { getOpenAI, MUSTAFO_SYSTEM_PROMPT } from "~/lib/openai.server";
import { searchUnsplashImage } from "~/lib/unsplash.server";
import type { MealSuggestion, RecipeIngredient } from "~/types";

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

// ---------- Recipe (streaming, three-step) ----------

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
