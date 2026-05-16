export const EXPRESSIONS = [
  "/mustafo/expressions/curious.png",
  "/mustafo/expressions/goofy.png",
  "/mustafo/expressions/dramatic.png",
  "/mustafo/expressions/chaotic.png",
  "/mustafo/expressions/loud.png",
  "/mustafo/expressions/sarcastic.png",
] as const;

export const TALKING = [
  "/mustafo/talking/talking_1.png",
  "/mustafo/talking/talking_2.png",
  "/mustafo/talking/talking_3.png",
] as const;

export const LOADING_MESSAGES = [
  "Reading through your stuff...",
  "Wow, that's a lot...",
  "Are you sure that's not expired?",
  "Cooking the perfect suggestion...",
  "Finding hidden gems in there...",
  "Your fridge is better than you think...",
  "This is gonna slap...",
  "Trust the process...",
  "Magic happening...",
  "Chef's intuition engaged...",
  "Consulting the food gods...",
] as const;

export const MUSTAFO_GREETINGS = [
  "Hey! I'm Mustafo, your personal chef.",
  "Tell me what's in your fridge and I'll turn it into something delicious.",
  "Expired things don't hurt my feelings. Let's cook.",
] as const;

// `{name}` is replaced at render time with the user's first name. `highlight`
// renders in the accent color.
export const COOK_GREETING_LINES = [
  { prefix: "Hey {name},", highlight: "what's in there?" },
  { prefix: "{name},", highlight: "what's the damage?" },
  { prefix: "Yo {name},", highlight: "what'd you find?" },
  { prefix: "Open up, {name}.", highlight: "What we working with?" },
  { prefix: "Alright {name},", highlight: "what's the haul?" },
] as const;

export const COOK_GREETING_SUBLINES = [
  "Drop everything you've got. Expired stuff is fine. I'll skip what's cursed.",
  "Type it all out. Even the questionable bits. I'll sort the chaos.",
  "Dump the list. Sketchy stuff? I'll roast it gently.",
  "Don't filter. I will. Expired, weird, half-eaten, all fair game.",
  "Tell me everything. The fridge has no secrets from me.",
] as const;

export const SUGGESTIONS_HEADERS = [
  "Here's what's calling your name",
  "Cooked up three options for you",
  "Three contenders, chef",
  "Pick your fighter",
  "Here's what we're working with",
] as const;

export const SUGGESTIONS_SUBHEADERS = [
  "Pick one and I'll walk you through it. Or scroll up and edit your fridge.",
  "Tap one for the full recipe. Or rethink the fridge, your call.",
  "Click one and let's cook. Otherwise scroll up and try again.",
  "Choose your destiny. Or tweak the ingredients up top.",
  "Pick a winner. I'll handle the steps. Not feeling these? Edit and resubmit.",
] as const;
