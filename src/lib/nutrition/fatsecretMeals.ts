export const FATSECRET_MEALS = [
  "breakfast",
  "lunch",
  "dinner",
  "other",
] as const;

export type FatSecretMeal = (typeof FATSECRET_MEALS)[number];

export const FATSECRET_MEAL_LABELS: Record<FatSecretMeal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  other: "Snacks",
};

export function isFatSecretMeal(value: string): value is FatSecretMeal {
  return (FATSECRET_MEALS as readonly string[]).includes(value);
}

/** API returns `Breakfast`; diary writes use `breakfast`. */
export function normalizeFatSecretMeal(value: string | undefined): FatSecretMeal | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return isFatSecretMeal(normalized) ? normalized : null;
}
