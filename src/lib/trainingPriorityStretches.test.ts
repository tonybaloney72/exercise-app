import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import {
  shouldIncludeStretchPool,
  stretchWarmUpQuota,
} from "@/lib/trainingPriorityStretches";
import type { ExerciseCategory } from "@/types";

function catsFromPlan(...categories: ExerciseCategory[]) {
  return new Set(categories);
}

describe("trainingPriorityStretches", () => {
  it("upper_body omits lower pool on upper-only days", () => {
    const monday = buildCatalogWeek()[1]!;
    expect(
      shouldIncludeStretchPool(
        "lower",
        monday,
        catsFromPlan("UP", "CF"),
        "upper_body",
        undefined,
        false,
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

  it("balanced preset omits upper pool on lower-only days", () => {
    const tuesday = buildCatalogWeek()[2]!;
    expect(
      shouldIncludeStretchPool(
        "upper",
        tuesday,
        catsFromPlan("LB", "CR", "CS"),
        "balanced",
        undefined,
        false,
      ),
    ).toBe(false);
    expect(
      shouldIncludeStretchPool(
        "lower",
        tuesday,
        catsFromPlan("LB", "CR", "CS"),
        "balanced",
        undefined,
        false,
      ),
    ).toBe(true);
  });

  it("balanced preset still includes upper pool on upper days", () => {
    const monday = buildCatalogWeek()[1]!;
    expect(
      shouldIncludeStretchPool(
        "upper",
        monday,
        catsFromPlan("UP", "CF", "CL"),
        "balanced",
        undefined,
        false,
      ),
    ).toBe(true);
  });
});
