import { describe, expect, it } from "vitest";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  buildCatalogWeek,
  isThemesOnlyCatalogPlan,
  TRAINING_WEEK_CATALOG,
} from "@/data/trainingWeekCatalog";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import type { ExercisePreferenceMap } from "@/lib/repos";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];
const EMPTY_PREFS: ExercisePreferenceMap = {};

describe("trainingWeekCatalog", () => {
  it("stores themes only - no exercise ids in seed rounds", () => {
    for (const day of TRAINING_WEEK_CATALOG) {
      expect(isThemesOnlyCatalogPlan(day)).toBe(true);
    }
    const week = buildCatalogWeek();
    for (let dow = 0; dow < 7; dow++) {
      expect(isThemesOnlyCatalogPlan(week[dow]!)).toBe(true);
    }
  });

  it("materializes exercises from the library, not author template ids", () => {
    const week = materializeTrainingWeek(
      buildCatalogWeek(),
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
    );
    const monday = week[1]!;
    expect(monday.rounds[0]!.exercises.length).toBeGreaterThan(0);
    expect(monday.rounds.every((r) => r.exercises.length > 0)).toBe(true);
  });
});
