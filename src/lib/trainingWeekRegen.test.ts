import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  mergeRegeneratedDays,
  regenDayIndicesForPrefsChange,
  restoreCustomizedDays,
} from "@/lib/trainingWeekRegen";
import type { ExercisePreferenceMap } from "@/lib/repos";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];
const EMPTY_PREFS: ExercisePreferenceMap = {};

describe("regenDayIndicesForPrefsChange", () => {
  it("includes today through Saturday when today is not frozen", () => {
    expect(
      regenDayIndicesForPrefsChange({ todayDayOfWeek: 1, freezeTodayPlan: false }),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("skips today when today's plan is frozen (in progress or completed)", () => {
    expect(
      regenDayIndicesForPrefsChange({ todayDayOfWeek: 1, freezeTodayPlan: true }),
    ).toEqual([2, 3, 4, 5, 6]);
  });

  it("returns empty when today is Saturday and today is frozen", () => {
    expect(
      regenDayIndicesForPrefsChange({ todayDayOfWeek: 6, freezeTodayPlan: true }),
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

  it("does not replace days the user saved from Edit Day", () => {
    const catalog = buildCatalogWeek();
    const stored = materializeTrainingWeek(
      catalog,
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
    );
    stored[1] = { ...stored[1]!, planCustomized: true };
    const generated = materializeTrainingWeek(
      catalog,
      EMPTY_PREFS,
      EQUIP,
      "upper_body",
      "compact",
    );
    const merged = mergeRegeneratedDays(stored, generated, [1, 2]);
    expect(merged[1]?.rounds).toEqual(stored[1]?.rounds);
    expect(merged[1]?.planCustomized).toBe(true);
    expect(merged[2]?.rounds).toEqual(generated[2]?.rounds);
  });
});

describe("restoreCustomizedDays", () => {
  it("overlays Edit Day saves onto a fully generated week", () => {
    const catalog = buildCatalogWeek();
    const stored = materializeTrainingWeek(
      catalog,
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
    );
    stored[1] = { ...stored[1]!, planCustomized: true };
    const generated = materializeTrainingWeek(
      catalog,
      EMPTY_PREFS,
      EQUIP,
      "upper_body",
      "compact",
    );
    const restored = restoreCustomizedDays(stored, generated);
    expect(restored[1]?.rounds).toEqual(stored[1]?.rounds);
    expect(restored[2]?.rounds).toEqual(generated[2]?.rounds);
  });
});
