import { describe, expect, it } from "vitest";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import {
  applyProgramProfileToDayPlan,
  buildProgramProfileInput,
} from "@/lib/programProfile";
import type { WeeklyCategoryLayout } from "@/lib/weeklyCategoryLayout";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import type { ExercisePreferenceMap } from "@/lib/repos";

const EMPTY_PREFS: ExercisePreferenceMap = {};

describe("programProfile layout mode", () => {
  it("rest day produces no rounds", () => {
    const mon = getCatalogPlanForDay(1);
    const layout: WeeklyCategoryLayout = { 1: [] };
    const profile = buildProgramProfileInput("balanced", undefined, false, {
      layoutMode: true,
      weeklyCategoryLayout: layout,
    });
    const out = applyProgramProfileToDayPlan(
      mon,
      "balanced",
      "standard",
      [...DEFAULT_AVAILABLE_EQUIPMENT],
      EMPTY_PREFS,
      undefined,
      "test",
      profile,
    );
    expect(out.rounds).toEqual([]);
  });

  it("only allows categories from enabled groups", () => {
    const mon = getCatalogPlanForDay(1);
    const layout: WeeklyCategoryLayout = { 1: ["upper_push", "upper_pull"] };
    const profile = buildProgramProfileInput("balanced", undefined, false, {
      layoutMode: true,
      weeklyCategoryLayout: layout,
    });
    const out = applyProgramProfileToDayPlan(
      mon,
      "balanced",
      "standard",
      [...DEFAULT_AVAILABLE_EQUIPMENT],
      EMPTY_PREFS,
      undefined,
      "test",
      profile,
    );
    const cats = new Set(
      out.rounds.flatMap((r) => r.exercises.map((e) => e.category)),
    );
    for (const c of cats) {
      expect(["UP", "UPL"]).toContain(c);
    }
  });
});
