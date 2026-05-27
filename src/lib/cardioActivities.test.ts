import { describe, expect, it } from "vitest";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import {
  normalizeDayPlanCardio,
  planHasJog,
  resolveCardioActivities,
  suggestWeeklyCardioFromCatalog,
} from "@/lib/cardioActivities";
import { activeRecoveryDayPlan, applyRestDayToPlan } from "@/lib/restDays";
import { prepareCatalogDayForUser } from "@/lib/weekPlanPreferences";
import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import type { UserSettings } from "@/types";

describe("cardioActivities", () => {
  it("migrates hasJog to cardioActivities", () => {
    const mon = getCatalogPlanForDay(1);
    const norm = normalizeDayPlanCardio(mon);
    expect(planHasJog(mon)).toBe(true);
    expect(resolveCardioActivities(norm).map((a) => a.kind)).toEqual(["jog"]);
  });

  it("applies weekly cardio from settings", () => {
    const tue = getCatalogPlanForDay(2);
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      weeklyCardioCustomized: true,
      weeklyCardioByDay: { ...suggestWeeklyCardioFromCatalog(), 2: ["walk", "cycle"] },
      availableEquipment: [...DEFAULT_SETTINGS.availableEquipment, "bicycle"],
    };
    const out = prepareCatalogDayForUser(tue, settings, settings.availableEquipment);
    expect(resolveCardioActivities(out).map((a) => a.kind)).toEqual(["walk", "cycle"]);
    expect(planHasJog(out)).toBe(false);
  });

  it("full rest clears rounds", () => {
    const mon = getCatalogPlanForDay(1);
    const rested = applyRestDayToPlan(mon, "full_rest");
    expect(rested.restDayMode).toBe("full_rest");
    expect(rested.rounds.every((r) => r.exercises.length === 0)).toBe(true);
  });

  it("active recovery is one light core round", () => {
    const mon = getCatalogPlanForDay(1);
    const ar = activeRecoveryDayPlan(mon);
    expect(ar.restDayMode).toBe("active_recovery");
    expect(ar.rounds).toHaveLength(1);
    expect(ar.coreGroups).toEqual(["CS"]);
    expect(ar.strengthFocus).toEqual([]);
  });

  it("defaults Sunday to active recovery", () => {
    const settings = { ...DEFAULT_SETTINGS };
    const sun = getCatalogPlanForDay(0);
    const out = prepareCatalogDayForUser(sun, settings, settings.availableEquipment);
    expect(out.restDayMode).toBe("active_recovery");
  });
});
