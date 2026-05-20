import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import {
  countPlannedExercises,
  isDayPlanDraftDirty,
} from "@/lib/dayPlanDraft";
import { cloneDayPlan } from "@/lib/trainingWeekCustomize";

describe("isDayPlanDraftDirty", () => {
  it("detects exercise additions", () => {
    const base = buildCatalogWeek()[1]!;
    const edited = cloneDayPlan(base);
    edited.rounds[0]!.exercises.push({
      exerciseId: "UP-1",
      category: "UP",
      targetReps: "10",
    });
    expect(isDayPlanDraftDirty(base, edited)).toBe(true);
    expect(isDayPlanDraftDirty(base, base)).toBe(false);
  });
});

describe("countPlannedExercises", () => {
  it("sums exercises across rounds", () => {
    const plan = buildCatalogWeek()[1]!;
    const withOne = cloneDayPlan(plan);
    withOne.rounds[0]!.exercises = [
      { exerciseId: "UP-1", category: "UP", targetReps: "10" },
    ];
    expect(countPlannedExercises(withOne)).toBe(1);
  });
});
