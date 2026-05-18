import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import {
  shouldIncludeStretchPool,
  stretchWarmUpQuota,
} from "@/lib/trainingPriorityStretches";
import { weightsForPreset } from "@/lib/trainingPriorities";
import type { ExerciseCategory } from "@/types";

function catsFromPlan(...categories: ExerciseCategory[]) {
  return new Set(categories);
}

describe("trainingPriorityStretches", () => {
  it("upper_body omits lower pool on upper-only days", () => {
    const monday = buildCatalogWeek()[1]!;
    const weights = weightsForPreset("upper_body");
    expect(
      shouldIncludeStretchPool(
        "lower",
        monday,
        catsFromPlan("UP", "CF"),
        "upper_body",
        weights,
      ),
    ).toBe(false);
  });

  it("conditioning preset boosts conditioning warm quota", () => {
    expect(stretchWarmUpQuota("conditioning", "conditioning")).toBe(4);
    expect(stretchWarmUpQuota("core", "conditioning")).toBe(0);
  });

  it("minimal_core suppresses core warm quota", () => {
    expect(stretchWarmUpQuota("core", "minimal_core")).toBe(0);
  });
});
