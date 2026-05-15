export type UserProfile = {
  username: string;
  profileImage: string | null;
  createdAt: string;
};

export type RecipeIngredient = {
  name: string;
  quantity: string;
  unit: string;
  isYouMightNeed: boolean;
};

export type Recipe = {
  ingredients: RecipeIngredient[];
  instructions: string[];
  intro: string;
  celebration: string;
};

export type Dish = {
  id: string;
  dishName: string;
  recipe: Recipe;
  originalIngredients: string;
  mealImage: string | null;
  rating: number;
  createdAt: string;
};

export type MealSuggestion = {
  name: string;
  description: string;
  likelihood: number;
  why: string;
  emoji: string;
  imageUrl?: string | null;
};
