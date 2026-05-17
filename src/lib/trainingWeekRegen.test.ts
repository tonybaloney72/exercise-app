import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  mergeRegeneratedDays,
  regenDayIndicesForPrefsChange,
} from "@/lib/trainingWeekRegen";
import type { ExercisePreferenceMap } from "@/lib/repos";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];
const EMPTY_PREFS: ExercisePreferenceMap = {};

describe("regenDayIndicesForPrefsChange", () => {
  it("includes today through Saturday when no workout started", () => {
    expect(
      regenDayIndicesForPrefsChange({ todayDayOfWeek: 1, workoutStartedToday: false }),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("skips today when a workout is in progress", () => {
    expect(
      regenDayIndicesForPrefsChange({ todayDayOfWeek: 1, workoutStartedToday: true }),
    ).toEqual([2, 3, 4, 5, 6]);
  });

  it("returns empty when today is Saturday and workout started", () => {
    expect(
      regenDayIndicesForPrefsChange({ todayDayOfWeek: 6, workoutStartedToday: true }),
    ).toEqual([]);
  });
});

describe("mergeRegeneratedDays", () => {
  it("preserves past days and replaces selected indices", () => {
    const catalog = buildCatalogWeek();
    const stored = materializeTrainingWeek(
      catalog,
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
    );
    const generated = materializeTrainingWeek(
      catalog,
      EMPTY_PREFS,
      EQUIP,
      "upper_body",
      "compact",
    );
    const merged = mergeRegeneratedDays(stored, generated, [1, 2]);

    expect(merged[0]?.theme).toBe(stored[0]?.theme);
    expect(merged[1]?.rounds).toEqual(generated[1]?.rounds);
    expect(merged[2]?.rounds).toEqual(generated[2]?.rounds);
    expect(merged[3]?.theme).toBe(stored[3]?.theme);
  });
});
