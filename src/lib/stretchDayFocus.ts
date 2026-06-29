import type { StretchThemePoolId } from "@/lib/stretchCatalogPools";
import type { DayPlan, ExerciseCategory } from "@/types";

const UPPER_CATS: ExerciseCategory[] = ["UP", "UPL"];
const LOWER_CATS: ExerciseCategory[] = ["LB"];
const CORE_CATS: ExerciseCategory[] = ["CF", "CL", "CR", "CS"];

const ALL_POOLS: StretchThemePoolId[] = [
  "upper",
  "lower",
  "core",
  "conditioning",
];

/** Whether a themed stretch pool applies from day focus only (no training-priority gating). */
export function shouldIncludeStretchPoolForDay(
  pool: StretchThemePoolId,
  plan: DayPlan,
  categoriesInDay: ReadonlySet<ExerciseCategory>,
): boolean {
  const hasUpper =
    plan.strengthFocus.some((c) => UPPER_CATS.includes(c)) ||
    UPPER_CATS.some((c) => categoriesInDay.has(c));
  const hasLower =
    plan.strengthFocus.some((c) => LOWER_CATS.includes(c)) ||
    categoriesInDay.has("LB");
  const hasCore =
    plan.coreGroups.length > 0 || CORE_CATS.some((c) => categoriesInDay.has(c));
  const hasPc =
    plan.strengthFocus.includes("PC") || categoriesInDay.has("PC");
  const hasCardio =
    hasPc || plan.hasJog || (plan.cardioActivities?.length ?? 0) > 0;

  switch (pool) {
    case "upper":
      return hasUpper;
    case "lower":
      if (hasLower) return true;
      return hasCardio && !hasUpper;
    case "core":
      return hasCore;
    case "conditioning":
      return hasPc;
    default: {
      const _exhaustive: never = pool;
      return _exhaustive;
    }
  }
}

export function includedStretchPoolsForDay(
  plan: DayPlan,
  categoriesInDay: ReadonlySet<ExerciseCategory>,
): StretchThemePoolId[] {
  return ALL_POOLS.filter((id) =>
    shouldIncludeStretchPoolForDay(id, plan, categoriesInDay),
  );
}
