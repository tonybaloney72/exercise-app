import { describe, expect, it } from "vitest";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import {
  addRoundAt,
  applyRoundCopyFromPriorInWorkout,
  insertEmptyRoundAt,
  insertRoundCopyAt,
  removeRoundAt,
  addWarmUpStretch,
  MAX_WORKOUT_ROUNDS,
  removeRoundExerciseAt,
  removeWarmUpStretchAt,
} from "@/lib/workoutLogStructure";
import type { WorkoutLog } from "@/types";

function emptyLog(): WorkoutLog {
  return {
    id: "w1",
    date: "2026-05-18",
    dayOfWeek: 1,
    warmUpCompleted: false,
    warmUpExercises: [
      { exerciseId: "SW-1", completed: false, skipped: false },
    ],
    coolDownCompleted: true,
    coolDownExercises: [],
    rounds: [
      {
        roundNumber: 1,
        exercises: [
          { exerciseId: "CB-1", completed: false, skipped: false },
          { exerciseId: "CB-2", completed: false, skipped: false },
        ],
      },
    ],
  };
}

describe("workoutLogStructure", () => {
  it("addRoundAt appends empty round with next number", () => {
    const next = addRoundAt(emptyLog());
    expect(next.rounds).toHaveLength(2);
    expect(next.rounds[1].roundNumber).toBe(2);
    expect(next.rounds[1].exercises).toEqual([]);
  });

  it("addRoundAt is capped at MAX_WORKOUT_ROUNDS", () => {
    let log = emptyLog();
    while (log.rounds.length < MAX_WORKOUT_ROUNDS) {
      log = addRoundAt(log);
    }
    expect(log.rounds).toHaveLength(MAX_WORKOUT_ROUNDS);
    expect(addRoundAt(log).rounds).toHaveLength(MAX_WORKOUT_ROUNDS);
  });

  it("removeRoundExerciseAt drops slot by index", () => {
    const next = removeRoundExerciseAt(emptyLog(), 1, 0);
    expect(next.rounds[0].exercises).toHaveLength(1);
    expect(next.rounds[0].exercises[0].exerciseId).toBe("CB-2");
  });

  it("removeRoundAt drops a round and renumbers", () => {
    let log = addRoundAt(emptyLog());
    log = removeRoundAt(log, 2);
    expect(log.rounds).toHaveLength(1);
    expect(log.rounds[0].roundNumber).toBe(1);
  });

  it("removeRoundAt keeps at least one round", () => {
    expect(removeRoundAt(emptyLog(), 1).rounds).toHaveLength(1);
  });

  it("addWarmUpStretch appends unique stretch", () => {
    const next = addWarmUpStretch(emptyLog(), "SW-2");
    expect(next.warmUpExercises).toHaveLength(2);
    expect(next.warmUpExercises[1].exerciseId).toBe("SW-2");
  });

  it("removeWarmUpStretchAt updates completion flag", () => {
    const next = removeWarmUpStretchAt(emptyLog(), "SW-1");
    expect(next.warmUpExercises).toHaveLength(0);
    expect(next.warmUpCompleted).toBe(false);
  });

  it("insertEmptyRoundAt inserts an empty round and renumbers", () => {
    const next = insertEmptyRoundAt(emptyLog(), 1);
    expect(next.rounds).toHaveLength(2);
    expect(next.rounds[1]?.exercises).toEqual([]);
    expect(next.rounds.map((r) => r.roundNumber)).toEqual([1, 2]);
  });

  it("insertRoundCopyAt inserts repeat copy and renumbers", () => {
    const prefs = {
      availableEquipment: [...DEFAULT_AVAILABLE_EQUIPMENT],
      dislikedExerciseIds: new Set<string>(),
    };
    const next = insertRoundCopyAt(emptyLog(), 1, 1, "repeat", prefs);
    expect(next.rounds).toHaveLength(2);
    expect(next.rounds[1]?.exercises.map((e) => e.exerciseId)).toEqual([
      "CB-1",
      "CB-2",
    ]);
    expect(next.rounds[1]?.exercises.every((e) => !e.completed)).toBe(true);
    expect(next.rounds.map((r) => r.roundNumber)).toEqual([1, 2]);
  });

  it("applyRoundCopyFromPriorInWorkout replaces target round", () => {
    let log = insertRoundCopyAt(emptyLog(), 1, 1, "repeat", {
      availableEquipment: [...DEFAULT_AVAILABLE_EQUIPMENT],
      dislikedExerciseIds: new Set<string>(),
    });
    log = {
      ...log,
      rounds: log.rounds.map((r, i) =>
        i === 1 ? { ...r, exercises: [] } : r,
      ),
    };
    const next = applyRoundCopyFromPriorInWorkout(log, 2, "repeat", {
      availableEquipment: [...DEFAULT_AVAILABLE_EQUIPMENT],
      dislikedExerciseIds: new Set<string>(),
    });
    expect(next.rounds[1]?.exercises).toHaveLength(2);
  });

  it("applyRoundCopyFromPriorInWorkout copies swapped exercises as seen", () => {
    const prefs = {
      availableEquipment: [...DEFAULT_AVAILABLE_EQUIPMENT],
      dislikedExerciseIds: new Set<string>(),
    };
    let log = insertEmptyRoundAt(emptyLog(), 1);
    log = {
      ...log,
      rounds: log.rounds.map((r, i) =>
        i === 0
          ? {
              ...r,
              exercises: [
                {
                  exerciseId: "CB-1",
                  swappedWith: "CB-3",
                  completed: false,
                  skipped: false,
                  targetPrescription: "10",
                },
                {
                  exerciseId: "CB-2",
                  completed: false,
                  skipped: false,
                  targetPrescription: "8",
                },
              ],
            }
          : r,
      ),
    };
    const next = applyRoundCopyFromPriorInWorkout(log, 2, "repeat", prefs);
    expect(next.rounds[1]?.exercises.map((e) => e.exerciseId)).toEqual([
      "CB-3",
      "CB-2",
    ]);
    expect(next.rounds[1]?.exercises.every((e) => e.swappedWith == null)).toBe(
      true,
    );
    expect(
      next.rounds[1]?.exercises.map((e) => e.targetPrescription),
    ).toEqual(["10", "8"]);
  });

  it("repeat copy preserves working weight from the source round", () => {
    const prefs = {
      availableEquipment: [...DEFAULT_AVAILABLE_EQUIPMENT],
      dislikedExerciseIds: new Set<string>(),
    };
    let log = insertEmptyRoundAt(emptyLog(), 1);
    log = {
      ...log,
      rounds: log.rounds.map((r, i) =>
        i === 0
          ? {
              ...r,
              exercises: [
                {
                  exerciseId: "CB-1",
                  completed: true,
                  skipped: false,
                  targetPrescription: "10",
                  actualReps: 10,
                  weightLb: 25,
                },
                {
                  exerciseId: "CB-2",
                  completed: false,
                  skipped: false,
                  targetPrescription: "8",
                  weightLb: 40,
                },
              ],
            }
          : r,
      ),
    };
    const next = applyRoundCopyFromPriorInWorkout(log, 2, "repeat", prefs);
    expect(next.rounds[1]?.exercises.map((e) => e.weightLb)).toEqual([25, 40]);
    expect(next.rounds[1]?.exercises.every((e) => !e.completed)).toBe(true);
    expect(next.rounds[1]?.exercises.every((e) => e.actualReps == null)).toBe(
      true,
    );
  });
});
