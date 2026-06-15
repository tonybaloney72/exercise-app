import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import {
  mergeRegeneratedDays,
  regenDayIndicesForPrefsChange,
} from "@/lib/trainingWeekRegen";
import { weekExerciseIdsByDay } from "@/test/weekTestUtils";
import {
  GOLDEN_EMPTY_PREFS,
  GOLDEN_EQUIPMENT,
  GOLDEN_VARIETY_SEED,
  materializeGoldenBalancedWeek,
} from "./fixtures";

/**
 * Behavior contract: partial week regen preserves frozen days and replaces selected indices.
 */
describe("trainingWeekRegen golden contract", () => {
  it("locks regen day indices for Tuesday with today frozen", () => {
    expect(
      regenDayIndicesForPrefsChange({ todayDayOfWeek: 2, freezeTodayPlan: true }),
    ).toMatchInlineSnapshot(`
      [
        3,
        4,
        5,
        6,
      ]
    `);
  });

  it("locks which days change when merging regenerated Mon/Tue only", () => {
    const stored = materializeGoldenBalancedWeek();
    const generated = materializeTrainingWeek(
      buildCatalogWeek(),
      GOLDEN_EMPTY_PREFS,
      GOLDEN_EQUIPMENT,
      "upper_body",
      "compact",
      undefined,
      GOLDEN_VARIETY_SEED,
    );
    const merged = mergeRegeneratedDays(stored, generated, [1, 2]);

    const storedIds = weekExerciseIdsByDay(stored);
    const generatedIds = weekExerciseIdsByDay(generated);
    const mergedIds = weekExerciseIdsByDay(merged);

    expect(mergedIds[0]).toEqual(storedIds[0]);
    expect(mergedIds[1]).toEqual(generatedIds[1]);
    expect(mergedIds[2]).toEqual(generatedIds[2]);
    expect(mergedIds[3]).toEqual(storedIds[3]);
    expect(mergedIds.map((day) => day.length)).toMatchInlineSnapshot(`
      [
        15,
        9,
        9,
        15,
        15,
        15,
        15,
      ]
    `);
  });
});
