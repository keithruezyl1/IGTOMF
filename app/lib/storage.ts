import type { Dish, UserProfile } from "~/types";

const PROFILE_KEY = "igotthis_profile";
const DISHES_KEY = "igotthis_dishes";

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function setProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
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

export function clearAll() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_KEY);
  window.localStorage.removeItem(DISHES_KEY);
}
