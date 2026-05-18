import type { DayPlan, ExerciseCategory } from "@/types";

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
 * Unlike `strengthFocus` / `coreGroups`, this updates after materialization and program focus.
 */
export function categoriesPresentInPlan(plan: DayPlan): ExerciseCategory[] {
  const present = new Set<ExerciseCategory>();
  for (const round of plan.rounds) {
    for (const slot of round.exercises) {
      present.add(slot.category);
    }
  }
  if (plan.hasJog && !present.has("PC")) {
    present.add("PC");
  }
  return DISPLAY_ORDER.filter((c) => present.has(c));
}
