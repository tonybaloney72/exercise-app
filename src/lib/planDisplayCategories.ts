import { CATEGORIES } from "@/data/categories";
import {
  isBalancedScores,
  resolveTrainingPriorityScores,
} from "@/lib/trainingPriorities";
import type {
  DayPlan,
  ExerciseCategory,
  TrainingPriorityPreset,
} from "@/types";

const DISPLAY_ORDER: ExerciseCategory[] = [
  "UP",
  "UPL",
  "LB",
  "PC",
  "CF",
  "CL",
  "CR",
  "CS",
];

/**
 * Categories actually prescribed in the day's rounds (for Weekly pills / headers).
 * Jog days do not add PC here - use a separate jog badge when `plan.hasJog`.
 */
export function categoriesPresentInPlan(plan: DayPlan): ExerciseCategory[] {
  const present = new Set<ExerciseCategory>();
  for (const round of plan.rounds) {
    for (const slot of round.exercises) {
      present.add(slot.category);
    }
  }
  return DISPLAY_ORDER.filter((c) => present.has(c));
}

export type PlanDaySubtitleOptions = {
  /** Custom-edited weeks: show what's prescribed, not the catalog theme line. */
  preferMaterialized?: boolean;
};

function materializedSubtitle(plan: DayPlan): string {
  const cats = categoriesPresentInPlan(plan);
  if (cats.length === 0) return plan.theme;
  return cats.map((c) => CATEGORIES[c].shortName).join(" + ");
}

/**
 * Subtitle under the day name: catalog theme when balanced auto-generated;
 * otherwise categories actually in the day's rounds.
 */
export function planDaySubtitle(
  plan: DayPlan,
  preset: TrainingPriorityPreset = "balanced",
  options?: PlanDaySubtitleOptions & {
    customized?: boolean;
    scores?: ReturnType<typeof resolveTrainingPriorityScores>;
  },
): string {
  const scores =
    options?.scores ??
    resolveTrainingPriorityScores({ trainingPriorityPreset: preset });
  const useMaterialized =
    options?.preferMaterialized === true ||
    options?.customized === true ||
    !isBalancedScores(scores);
  if (!useMaterialized) return plan.theme;
  return materializedSubtitle(plan);
}
