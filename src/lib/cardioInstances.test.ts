import { describe, expect, it } from "vitest";
import {
  appendCardioKind,
  cardioRowKey,
  ensureCardioInstanceIds,
} from "@/lib/cardioInstances";
import { getCardioLog, patchCardioLog } from "@/lib/cardioWorkoutLog";
import type { WorkoutLog } from "@/types";

const emptyLog: WorkoutLog = {
  id: "1",
  date: "2026-05-18",
  dayOfWeek: 1,
  warmUpCompleted: true,
  warmUpExercises: [],
  coolDownCompleted: true,
  coolDownExercises: [],
  rounds: [],
};

describe("cardioInstances", () => {
  it("allows multiple walks on one workout", () => {
    let log = appendCardioKind(emptyLog, "walk");
    log = appendCardioKind(log, "walk");
    const rows = log.cardioExercises ?? [];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.exerciseId).toBe("END-WALK");
    expect(rows[1]!.exerciseId).toBe("END-WALK");
    expect(cardioRowKey(rows[0]!)).not.toBe(cardioRowKey(rows[1]!));
  });

  it("patches by instance key without affecting sibling rows", () => {
    let log = appendCardioKind(emptyLog, "walk");
    log = appendCardioKind(log, "walk");
    const key = cardioRowKey(log.cardioExercises![1]!);
    log = patchCardioLog(log, key, { actualDistanceMi: 2.5, completed: true });
    expect(log.cardioExercises![0]!.actualDistanceMi).toBeUndefined();
    expect(log.cardioExercises![1]!.actualDistanceMi).toBe(2.5);
    expect(getCardioLog(log, key)?.completed).toBe(true);
  });

  it("assigns instance ids to legacy rows", () => {
    const legacy: WorkoutLog = {
      ...emptyLog,
      cardioExercises: [
        { exerciseId: "END-WALK", completed: true, skipped: false },
        { exerciseId: "END-WALK", completed: true, skipped: false },
      ],
    };
    const fixed = ensureCardioInstanceIds(legacy);
    const keys = fixed.cardioExercises!.map(cardioRowKey);
    expect(new Set(keys).size).toBe(2);
  });
});
