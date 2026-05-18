import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import {
  dayPlanContainsDislikedExercise,
  getFrozenPastDayPlanCopy,
} from "@/lib/trainingWeekFrozenDay";
import type { ExercisePreferenceMap } from "@/lib/repos";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];

describe("dayPlanContainsDislikedExercise", () => {
  it("returns false when there are no dislikes", () => {
    const monday = materializeTrainingWeek(
      buildCatalogWeek(),
      {},
      EQUIP,
      "balanced",
      "standard",
    )[1]!;
    expect(dayPlanContainsDislikedExercise(monday, new Set())).toBe(false);
  });

  it("detects a disliked exercise in rounds", () => {
    const monday = materializeTrainingWeek(
      buildCatalogWeek(),
      {},
      EQUIP,
      "balanced",
      "standard",
    )[1]!;
    const dislikedId = monday.rounds[0]!.exercises[0]!.exerciseId;
    expect(dayPlanContainsDislikedExercise(monday, new Set([dislikedId]))).toBe(
      true,
    );
  });
});

describe("getFrozenPastDayPlanCopy", () => {
  it("includes a disliked-on-frozen hint when the plan still has that exercise", () => {
    const monday = materializeTrainingWeek(
      buildCatalogWeek(),
      {},
      EQUIP,
      "balanced",
      "standard",
    )[1]!;
    const dislikedId = monday.rounds[0]!.exercises[0]!.exerciseId;
    const prefs: ExercisePreferenceMap = { [dislikedId]: "disliked" };
    const copy = getFrozenPastDayPlanCopy(monday, prefs);
    expect(copy.frozenPlanMessage).toContain("today and upcoming");
    expect(copy.dislikedOnFrozenPlanMessage).toContain("disliked");
  });

  it("omits the disliked hint when the frozen plan is clean", () => {
    const monday = materializeTrainingWeek(
      buildCatalogWeek(),
      {},
      EQUIP,
      "balanced",
      "standard",
    )[1]!;
    const copy = getFrozenPastDayPlanCopy(monday, {});
    expect(copy.dislikedOnFrozenPlanMessage).toBeNull();
  });
});
