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
