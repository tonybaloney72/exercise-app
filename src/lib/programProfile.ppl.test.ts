import { describe, expect, it } from "vitest";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { resolveCardioActivities } from "@/lib/cardioActivities";
import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import {
  applyProgramProfileToDayPlan,
  buildProgramProfileInputFromSettings,
} from "@/lib/programProfile";
import { PPL_LEG_CORE_ROUND } from "@/lib/pplDayMaterializer";
import {
  PPL_CORE_BLOCK_COUNT,
  pplWorkingExerciseCount,
} from "@/lib/pplRoundDensity";
import { buildPplWeek, getPplPlanForDay } from "@/lib/pplWeekTemplate";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import { activeRecoveryDayPlan } from "@/lib/restDays";
import type { ExerciseCategory } from "@/types";
import type { ExercisePreferenceMap } from "@/lib/repos";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];
const EMPTY_PREFS: ExercisePreferenceMap = {};
const PRIORITIES_SETTINGS = {
  ...DEFAULT_SETTINGS,
  programMode: "preset" as const,
};

function roundExerciseIds(
  plan: ReturnType<typeof applyProgramProfileToDayPlan>,
  roundIndex: number,
): string[] {
  return plan.rounds[roundIndex]?.exercises.map((e) => e.exerciseId) ?? [];
}

describe("PPL preset mode (programProfile)", () => {
  const profile = buildProgramProfileInputFromSettings(PRIORITIES_SETTINGS);

  it("Monday push: three working rounds, cardio in endurance block", () => {
    const mon = getPplPlanForDay(1);
    const shaped = applyProgramProfileToDayPlan(
      mon,
      "balanced",
      "standard",
      EQUIP,
      EMPTY_PREFS,
      undefined,
      undefined,
      profile,
    );
    const w = pplWorkingExerciseCount("standard");
    expect(shaped.rounds).toHaveLength(3);
    expect(shaped.rounds[0]!.exercises).toHaveLength(w);
    expect(roundExerciseIds(shaped, 0)).toEqual(roundExerciseIds(shaped, 2));
    expect(
      shaped.rounds[0]!.exercises.every((e) => e.category === "UP"),
    ).toBe(true);
    expect(resolveCardioActivities(shaped).length).toBeGreaterThan(0);
    expect(
      shaped.rounds.flatMap((r) => r.exercises.map((e) => e.exerciseId)),
    ).not.toContain("END-JOG");
  });

  it("Wednesday legs: LB rounds 1–3, core-only round 4", () => {
    const wed = getPplPlanForDay(3);
    const shaped = applyProgramProfileToDayPlan(
      wed,
      "balanced",
      "standard",
      EQUIP,
      EMPTY_PREFS,
      undefined,
      undefined,
      profile,
    );
    for (let r = 0; r < 3; r++) {
      expect(
        shaped.rounds[r]!.exercises.every((c) => c.category === "LB"),
      ).toBe(true);
    }
    const coreRound = shaped.rounds[PPL_LEG_CORE_ROUND - 1]!;
    expect(coreRound.exercises.length).toBe(PPL_CORE_BLOCK_COUNT.standard);
    const allowedCore = new Set<ExerciseCategory>(["CF", "CL", "CR", "CS"]);
    expect(
      coreRound.exercises.every((e) => allowedCore.has(e.category)),
    ).toBe(true);
  });

  it("active recovery day is CS-only in one round", () => {
    const sun = activeRecoveryDayPlan(getPplPlanForDay(0));
    const shaped = applyProgramProfileToDayPlan(
      sun,
      "balanced",
      "standard",
      EQUIP,
      EMPTY_PREFS,
      undefined,
      undefined,
      profile,
    );
    expect(shaped.rounds).toHaveLength(1);
    expect(
      shaped.rounds[0]!.exercises.every((e) => e.category === "CS"),
    ).toBe(true);
  });
});

describe("materializeTrainingWeek with PPL seed", () => {
  it("materializes push and leg days with set structure", () => {
    const week = materializeTrainingWeek(
      buildPplWeek(),
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
      {},
      "ppl-test-seed",
      buildProgramProfileInputFromSettings(PRIORITIES_SETTINGS),
      PRIORITIES_SETTINGS,
    );
    const mon = week[1]!;
    const wed = week[3]!;
    expect(mon.rounds).toHaveLength(3);
    expect(roundExerciseIds(mon, 0)).toEqual(roundExerciseIds(mon, 2));
    expect(wed.rounds[3]!.exercises.some((e) => e.category === "LB")).toBe(
      false,
    );
  });
});
