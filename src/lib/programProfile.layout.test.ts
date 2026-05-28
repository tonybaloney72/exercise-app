import { describe, expect, it } from "vitest";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import {
  applyProgramProfileToDayPlan,
  buildProgramProfileInput,
} from "@/lib/programProfile";
import type { WeeklyCategoryLayout } from "@/lib/weeklyCategoryLayout";
import type { WeeklyLayoutDayStructure } from "@/lib/weeklyLayoutDayStructure";
import { resolveLayoutDayStructure } from "@/lib/weeklyLayoutDayStructure";
import type { UserSettings } from "@/types";
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

  it("preserves Cardio & endurance block when layout cardio pill is off", () => {
    const sun = getCatalogPlanForDay(0);
    const layout: WeeklyCategoryLayout = { 0: ["lower"] };
    const profile = buildProgramProfileInput("balanced", undefined, false, {
      layoutMode: true,
      weeklyCategoryLayout: layout,
    });
    const userSettings = {
      programMode: "layout",
      weeklyCardioCustomized: true,
      weeklyCardioByDay: { 0: ["jog"] },
    } as UserSettings;
    const out = applyProgramProfileToDayPlan(
      { ...sun, hasJog: true, cardioActivities: [{ kind: "jog", exerciseId: "END-JOG" }] },
      "balanced",
      "standard",
      [...DEFAULT_AVAILABLE_EQUIPMENT],
      EMPTY_PREFS,
      undefined,
      "layout-ce-jog",
      profile,
      userSettings,
    );
    expect(out.hasJog).toBe(true);
    expect(out.cardioActivities?.some((a) => a.kind === "jog")).toBe(true);
  });

  it("blocks mode uses separate pull and cardio rounds", () => {
    const fri = getCatalogPlanForDay(5);
    const layout: WeeklyCategoryLayout = { 5: ["upper_pull", "cardio"] };
    const weeklyLayoutDayStructure: WeeklyLayoutDayStructure = {
      5: resolveLayoutDayStructure(5, layout[5]!, {
        5: {
          mode: "blocks",
          groupRounds: { upper_pull: 3, cardio: 1 },
          repeatStrength: false,
        },
      }),
    };
    const profile = buildProgramProfileInput("balanced", undefined, false, {
      layoutMode: true,
      weeklyCategoryLayout: layout,
      weeklyLayoutDayStructure,
    });
    const out = applyProgramProfileToDayPlan(
      fri,
      "balanced",
      "standard",
      [...DEFAULT_AVAILABLE_EQUIPMENT],
      EMPTY_PREFS,
      undefined,
      "layout-blocks",
      profile,
    );
    expect(out.rounds).toHaveLength(4);
    const pullRounds = out.rounds.filter((r) =>
      r.exercises.every((e) => e.category === "UPL"),
    );
    const cardioRounds = out.rounds.filter((r) =>
      r.exercises.every((e) => e.category === "PC"),
    );
    expect(pullRounds).toHaveLength(3);
    expect(cardioRounds).toHaveLength(1);
  });

  it("respects core subdivisions without pulling all four core categories", () => {
    const mon = getCatalogPlanForDay(1);
    const layout: WeeklyCategoryLayout = {
      1: ["upper_push", "core_front"],
    };
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
      "layout-core-sub",
      profile,
    );
    const cats = new Set(
      out.rounds.flatMap((r) => r.exercises.map((e) => e.category)),
    );
    for (const c of cats) {
      expect(["UP", "CF"]).toContain(c);
    }
    expect(cats.has("CL")).toBe(false);
    expect(cats.has("CR")).toBe(false);
    expect(cats.has("CS")).toBe(false);
  });
});
