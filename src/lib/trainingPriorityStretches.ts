import type { StretchThemePoolId } from "@/lib/stretchCatalogPools";
import {
  weightsForPreset,
  weightsFromScores,
  type TrainingPriorityScores,
  type TrainingPriorityWeights,
} from "@/lib/trainingPriorities";
import type { DayPlan, ExerciseCategory, TrainingPriorityPreset } from "@/types";

const UPPER_CATS: ExerciseCategory[] = ["UP", "UPL"];
const LOWER_CATS: ExerciseCategory[] = ["LB"];
const CORE_CATS: ExerciseCategory[] = ["CF", "CL", "CR", "CS"];

const BASE_WARM_QUOTAS: Record<StretchThemePoolId, number> = {
  upper: 2,
  lower: 3,
  core: 2,
  conditioning: 2,
};

function upperEmphasisScore(weights: TrainingPriorityWeights): number {
  return weights.upper_push + weights.upper_pull;
}

function poolWeight(
  pool: StretchThemePoolId,
  weights: TrainingPriorityWeights,
): number {
  switch (pool) {
    case "upper":
      return Math.max(weights.upper_push, weights.upper_pull);
    case "lower":
      return weights.lower;
    case "core":
      return weights.core;
    case "conditioning":
      return weights.cardio;
    default: {
      const _exhaustive: never = pool;
      return _exhaustive;
    }
  }
}

/** Whether a themed stretch pool applies for this day + priority scores. */
export function shouldIncludeStretchPool(
  pool: StretchThemePoolId,
  plan: DayPlan,
  categoriesInDay: ReadonlySet<ExerciseCategory>,
  preset: TrainingPriorityPreset,
  scores?: TrainingPriorityScores,
  customized = false,
): boolean {
  const weights: TrainingPriorityWeights = scores
    ? weightsFromScores(scores)
    : weightsForPreset(preset);
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

  if (customized && scores) {
    switch (pool) {
      case "upper":
        return (
          hasUpper || scores.upper_push >= 3 || scores.upper_pull >= 3
        );
      case "lower":
        if (scores.lower === 0) return false;
        if (
          scores.upper_push >= 3 &&
          scores.upper_pull >= 2 &&
          scores.lower <= 2 &&
          !hasLower
        ) {
          return false;
        }
        return (
          hasLower ||
          scores.lower >= 3 ||
          (scores.cardio >= 3 && (hasPc || plan.hasJog))
        );
      case "core":
        if (scores.core === 0) return false;
        if (scores.core >= 3) return true;
        return hasCore;
      case "conditioning":
        return scores.cardio >= 3 || hasPc;
      default: {
        const _exhaustive: never = pool;
        return _exhaustive;
      }
    }
  }

  switch (pool) {
    case "upper":
      if (hasUpper) return true;
      if (preset === "strength") return true;
      // Balanced follows each day's theme; do not pull upper on lower-only days.
      if (preset === "balanced") return false;
      return upperEmphasisScore(weights) >= 4;
    case "lower":
      if (preset === "upper_body" && !hasLower) return false;
      if (hasLower) return true;
      if (weights.lower >= 4) return true;
      if (weights.cardio >= 4 && (hasPc || plan.hasJog)) return true;
      if (preset === "balanced" && plan.hasJog) return true;
      return false;
    case "core":
      if (weights.core <= 1) return false;
      if (weights.core >= 4) return true;
      return hasCore;
    case "conditioning":
      return weights.cardio >= 4 || hasPc;
    default: {
      const _exhaustive: never = pool;
      return _exhaustive;
    }
  }
}

function scaledQuota(
  base: number,
  weight: number,
): number {
  return Math.max(0, Math.round(base * (weight / 2)));
}

/** Warm-up stretch count for a themed pool (derived from priority scores). */
export function stretchWarmUpQuota(
  pool: StretchThemePoolId,
  preset: TrainingPriorityPreset,
  scores?: TrainingPriorityScores,
  customized = false,
): number {
  if (customized && scores) {
    const w = scores;
    const groupScore =
      pool === "upper"
        ? Math.max(w.upper_push, w.upper_pull)
        : pool === "lower"
          ? w.lower
          : pool === "core"
            ? w.core
            : w.cardio;
    if (groupScore === 0) return 0;
    return Math.min(5, groupScore + 1);
  }
  if (preset === "conditioning") {
    if (pool === "conditioning") return 4;
    if (pool === "core") return 0;
    if (pool === "lower") return 3;
    if (pool === "upper") return 2;
  }
  if (preset === "minimal_core" && pool === "core") return 0;
  if (preset === "core_emphasis" && pool === "core") return 4;
  if (preset === "upper_body") {
    if (pool === "upper") return 4;
    if (pool === "lower") return 0;
  }
  if (preset === "lower_body") {
    if (pool === "lower") return 5;
    if (pool === "upper") return 2;
  }
  if (preset === "strength" && (pool === "upper" || pool === "lower")) {
    return 3;
  }

  const weights = weightsForPreset(preset);
  return scaledQuota(BASE_WARM_QUOTAS[pool], poolWeight(pool, weights));
}
