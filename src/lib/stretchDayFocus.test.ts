import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { shouldIncludeStretchPoolForDay } from "@/lib/stretchDayFocus";
import type { ExerciseCategory } from "@/types";

function catsFromPlan(...categories: ExerciseCategory[]) {
  return new Set(categories);
}

describe("stretchDayFocus", () => {
  it("includes upper pool on upper push days only", () => {
    const monday = buildCatalogWeek()[1]!;
    expect(
      shouldIncludeStretchPoolForDay("upper", monday, catsFromPlan("UP", "CF")),
    ).toBe(true);
    expect(
      shouldIncludeStretchPoolForDay("lower", monday, catsFromPlan("UP", "CF")),
    ).toBe(false);
  });

  it("omits upper pool on lower-only days", () => {
    const tuesday = buildCatalogWeek()[2]!;
    expect(
      shouldIncludeStretchPoolForDay(
        "upper",
        tuesday,
        catsFromPlan("LB", "CR", "CS"),
      ),
    ).toBe(false);
    expect(
      shouldIncludeStretchPoolForDay(
        "lower",
        tuesday,
        catsFromPlan("LB", "CR", "CS"),
      ),
    ).toBe(true);
    expect(
      shouldIncludeStretchPoolForDay(
        "core",
        tuesday,
        catsFromPlan("LB", "CR", "CS"),
      ),
    ).toBe(true);
  });
});
