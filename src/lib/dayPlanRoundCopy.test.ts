import { describe, expect, it } from "vitest";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  applyRoundCopyFromPriorInDayPlan,
  cloneRoundExercisesExact,
  insertEmptyRoundInDayPlan,
  insertRoundInDayPlan,
  structureRoundExercises,
} from "@/lib/dayPlanRoundCopy";
import type { DayPlan, RoundExercise } from "@/types";

const pushSlot: RoundExercise = {
  exerciseId: "UP-1",
  targetReps: "10",
  category: "UP",
};
const pullSlot: RoundExercise = {
  exerciseId: "UP-2",
  targetReps: "10",
  category: "UP",
};

function basePlan(): DayPlan {
  return {
    dayOfWeek: 1,
    name: "Push",
    theme: "",
    strengthFocus: [],
    coreGroups: [],
    hasJog: false,
    rounds: [
      { roundNumber: 1, exercises: [pushSlot, pullSlot] },
      { roundNumber: 2, exercises: [] },
    ],
  };
}

const prefs = {
  availableEquipment: [...DEFAULT_AVAILABLE_EQUIPMENT],
  dislikedExerciseIds: new Set<string>(),
};

describe("dayPlanRoundCopy", () => {
  it("cloneRoundExercisesExact copies slots", () => {
    const copied = cloneRoundExercisesExact([pushSlot]);
    expect(copied).toEqual([pushSlot]);
    expect(copied[0]).not.toBe(pushSlot);
  });

  it("insertEmptyRoundInDayPlan inserts an empty round", () => {
    const next = insertEmptyRoundInDayPlan(basePlan(), 1);
    expect(next.rounds).toHaveLength(3);
    expect(next.rounds[1]?.exercises).toEqual([]);
    expect(next.rounds.map((r) => r.roundNumber)).toEqual([1, 2, 3]);
  });

  it("insertRoundInDayPlan inserts a repeat copy below source", () => {
    const next = insertRoundInDayPlan(basePlan(), 1, 0, "repeat", prefs);
    expect(next.rounds).toHaveLength(3);
    expect(next.rounds[1]?.exercises).toEqual([pushSlot, pullSlot]);
    expect(next.rounds.map((r) => r.roundNumber)).toEqual([1, 2, 3]);
  });

  it("applyRoundCopyFromPriorInDayPlan fills target from prior round", () => {
    const next = applyRoundCopyFromPriorInDayPlan(
      basePlan(),
      1,
      "repeat",
      prefs,
    );
    expect(next.rounds[1]?.exercises).toEqual([pushSlot, pullSlot]);
  });

  it("structureRoundExercises avoids reusing source ids when possible", () => {
    const copied = structureRoundExercises(
      [pushSlot],
      new Set(["UP-1"]),
      prefs,
    );
    expect(copied).toHaveLength(1);
    expect(copied[0]?.category).toBe("UP");
    expect(copied[0]?.exerciseId).not.toBe("UP-1");
  });
});
