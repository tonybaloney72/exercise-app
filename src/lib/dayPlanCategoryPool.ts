import type { DayPlan, ExerciseCategory } from "@/types";

export type DayPlanCategoryPoolOptions = {
  /** When true, append `PC` on jog days if not already in the pool. */
  includePcWhenJog?: boolean;
  /** Used when strength/core lists are empty. */
  fallbackCategory?: ExerciseCategory;
};

/**
 * Unique strength + core categories from day metadata (catalog / PPL theme).
 */
export function dayPlanCategoryPool(
  plan: DayPlan,
  options: DayPlanCategoryPoolOptions = {},
): ExerciseCategory[] {
  const includePc = options.includePcWhenJog !== false;
  const fallback = options.fallbackCategory ?? "CS";
  const out: ExerciseCategory[] = [];
  for (const c of plan.strengthFocus) {
    if (!out.includes(c)) out.push(c);
  }
  for (const c of plan.coreGroups) {
    if (!out.includes(c)) out.push(c);
  }
  if (includePc && plan.hasJog && !out.includes("PC")) out.push("PC");
  if (out.length === 0) out.push(fallback);
  return out;
}
