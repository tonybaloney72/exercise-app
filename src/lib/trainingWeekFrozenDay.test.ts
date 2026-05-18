import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import {
  dayPlanContainsDislikedExercise,
  getFrozenPastDayPlanCopy,
} from "@/lib/trainingWeekFrozenDay";
import type { ExercisePreferenceMap } from "@/lib/repos";

describe("dayPlanContainsDislikedExercise", () => {
  const monday = buildCatalogWeek()[1]!;

  it("returns false when there are no dislikes", () => {
    expect(dayPlanContainsDislikedExercise(monday, new Set())).toBe(false);
  });

  it("detects a disliked exercise in rounds", () => {
    expect(dayPlanContainsDislikedExercise(monday, new Set(["UP-1"]))).toBe(true);
  });
});

describe("getFrozenPastDayPlanCopy", () => {
  const monday = buildCatalogWeek()[1]!;

  it("includes a disliked-on-frozen hint when the plan still has that exercise", () => {
    const prefs: ExercisePreferenceMap = { "UP-1": "disliked" };
    const copy = getFrozenPastDayPlanCopy(monday, prefs);
    expect(copy.frozenPlanMessage).toContain("today and upcoming");
    expect(copy.dislikedOnFrozenPlanMessage).toContain("disliked");
  });

  it("omits the disliked hint when the frozen plan is clean", () => {
    const copy = getFrozenPastDayPlanCopy(monday, {});
    expect(copy.dislikedOnFrozenPlanMessage).toBeNull();
  });
});
