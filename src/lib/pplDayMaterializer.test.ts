import { describe, expect, it } from "vitest";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { resolveCardioActivities } from "@/lib/cardioActivities";
import {
  buildPplRoundExerciseSets,
  materializePplDayPlan,
  PPL_LEG_CORE_ROUND,
} from "@/lib/pplDayMaterializer";
import {
  PPL_CORE_BLOCK_COUNT,
  pplWorkingExerciseCount,
} from "@/lib/pplRoundDensity";
import { getPplPlanForDay } from "@/lib/pplWeekTemplate";
import { activeRecoveryDayPlan } from "@/lib/restDays";
import type { ExercisePreferenceMap } from "@/lib/repos";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];
const EMPTY_PREFS: ExercisePreferenceMap = {};

function exerciseIds(round: { exercises: { exerciseId: string }[] }): string[] {
  return round.exercises.map((e) => e.exerciseId);
}

describe("pplDayMaterializer", () => {
  it("push day: 3 working rounds with matching density; cardio stays on plan", () => {
    const mon = getPplPlanForDay(1);
    const shaped = materializePplDayPlan(
      mon,
      "standard",
      EMPTY_PREFS,
      EQUIP,
    );
    const w = pplWorkingExerciseCount("standard");
    expect(shaped.rounds).toHaveLength(3);
    expect(shaped.rounds[0]!.exercises).toHaveLength(w);
    expect(shaped.rounds[1]!.exercises).toHaveLength(w);
    expect(shaped.rounds[2]!.exercises).toHaveLength(w);
    expect(exerciseIds(shaped.rounds[0]!)).toEqual(exerciseIds(shaped.rounds[1]!));
    expect(shaped.rounds[0]!.exercises.every((e) => e.category === "UP")).toBe(
      true,
    );
    expect(
      shaped.rounds.every((r) => !r.exercises.some((e) => e.exerciseId.startsWith("END-"))),
    ).toBe(true);
    expect(resolveCardioActivities(shaped).length).toBeGreaterThan(0);
  });

  it("full density uses 7 working exercises per round", () => {
    const mon = getPplPlanForDay(1);
    const sets = buildPplRoundExerciseSets(mon, "full", EMPTY_PREFS, EQUIP);
    expect(sets[0]).toHaveLength(7);
  });

  it("compact density uses 3 working exercises per round", () => {
    const mon = getPplPlanForDay(1);
    const sets = buildPplRoundExerciseSets(mon, "compact", EMPTY_PREFS, EQUIP);
    expect(sets[0]).toHaveLength(3);
  });

  it("legs day: LB rounds 1–3; round 4 core block matches density", () => {
    const wed = getPplPlanForDay(3);
    const shaped = materializePplDayPlan(
      wed,
      "full",
      EMPTY_PREFS,
      EQUIP,
    );
    expect(shaped.rounds).toHaveLength(4);
    for (let r = 0; r < 3; r++) {
      expect(shaped.rounds[r]!.exercises.every((e) => e.category === "LB")).toBe(
        true,
      );
    }
    expect(shaped.rounds[PPL_LEG_CORE_ROUND - 1]!.exercises.length).toBe(
      PPL_CORE_BLOCK_COUNT.full,
    );
  });

  it("active recovery is a single light core round", () => {
    const sun = activeRecoveryDayPlan(getPplPlanForDay(0));
    const shaped = materializePplDayPlan(
      sun,
      "standard",
      EMPTY_PREFS,
      EQUIP,
    );
    expect(shaped.rounds).toHaveLength(1);
    expect(shaped.rounds[0]!.exercises.every((e) => e.category === "CS")).toBe(
      true,
    );
  });
});
