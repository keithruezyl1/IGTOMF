import type { Dish } from "~/types";

const DISHES_KEY = "igotthis_dishes";
const PROFILE_IMAGE_KEY = "igotthis_profile_image";

export const LEGACY_PROFILE_KEY = "igotthis_profile";

export function getProfileImage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PROFILE_IMAGE_KEY);
  } catch {
    return null;
  }
}

export function setProfileImage(image: string | null) {
  if (typeof window === "undefined") return;
  if (image) window.localStorage.setItem(PROFILE_IMAGE_KEY, image);
  else window.localStorage.removeItem(PROFILE_IMAGE_KEY);
}

export function clearProfileImage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_IMAGE_KEY);
}

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

// ---------- Viewed-recipe tracking ----------
// Independent of the recipe cache. A recipe is "cached" the moment we
// pre-generate it; it's "viewed" only once the user actually navigates to
// /cook/recipe for it.

function viewedKey(generationId: string): string {
  return `recipe_viewed_${generationId}`;
}

export function getViewedIndices(generationId: string): number[] {
  if (typeof window === "undefined" || !generationId) return [];
  try {
    const raw = window.sessionStorage.getItem(viewedKey(generationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => Number.isInteger(n));
  } catch {
    return [];
  }
}

export function markRecipeViewed(generationId: string, index: number) {
  if (typeof window === "undefined" || !generationId) return;
  if (!Number.isInteger(index) || index < 0) return;
  try {
    const current = getViewedIndices(generationId);
    if (current.includes(index)) return;
    const next = [...current, index];
    window.sessionStorage.setItem(viewedKey(generationId), JSON.stringify(next));
  } catch {
    // ignore — sessionStorage unavailable
  }
}
