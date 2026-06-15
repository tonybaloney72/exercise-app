import { exerciseMap } from "@/core/catalog";
import { CARDIO_KIND_TO_EXERCISE_ID } from "@/lib/cardioActivities";
import {
  appendCardioKind as appendCardioKindInstance,
  cardioRowKey,
} from "@/lib/cardioInstances";
import { ensureCardioExercises } from "@/lib/resolveWorkoutCardio";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  formatPlanTargetPrescription,
  resolveExerciseSettings,
} from "@/utils/effectiveExerciseSettings";
import {
  structureRoundExercises,
  type RoundCopyMode,
  type RoundCopyPrefs,
} from "@/lib/dayPlanRoundCopy";
import { MAX_DAY_ROUNDS } from "@/lib/dayRoundLimits";
import type {
  CardioActivityKind,
  ExerciseCategory,
  ExerciseLog,
  RoundExercise,
  RoundLog,
  WorkoutLog,
} from "@/types";

function seedTimerTargetSeconds(
  resolved: ReturnType<typeof resolveExerciseSettings>,
): number | undefined {
  if (resolved.defaultSetMode !== "timer") return undefined;
  const sec = resolved.defaultTimerSeconds ?? DEFAULT_TIMER_SECONDS_FALLBACK;
  return Math.min(999, Math.max(5, sec));
}

function buildStrengthExerciseLog(exerciseId: string): ExerciseLog {
  const meta = exerciseMap[exerciseId];
  const stored = undefined;
  const resolved = resolveExerciseSettings(
    meta ?? {
      id: exerciseId,
      isTimeBased: false,
      category: "UP",
      name: "",
      defaultReps: "",
      notes: "",
    },
    stored,
  );
  const targetDurationSeconds = seedTimerTargetSeconds(resolved);
  const targetPrescription = formatPlanTargetPrescription(
    meta ?? { id: exerciseId, isTimeBased: false, defaultReps: "" },
    stored,
  );
  return {
    exerciseId,
    completed: false,
    skipped: false,
    targetPrescription,
    loggingMode: resolved.defaultSetMode,
    targetDurationSeconds,
  };
}

function buildStretchExerciseLogFromId(
  exerciseId: string,
  targetReps?: string,
): ExerciseLog {
  const meta = exerciseMap[exerciseId];
  const resolved = resolveExerciseSettings(
    meta ?? {
      id: exerciseId,
      isTimeBased: false,
      category: "SW",
      name: "",
      defaultReps: targetReps ?? "",
      notes: "",
    },
    undefined,
  );
  const targetDurationSeconds = seedTimerTargetSeconds(resolved);
  return {
    exerciseId,
    completed: false,
    skipped: false,
    targetPrescription:
      targetReps ??
      (resolved.defaultSetMode === "timer" && targetDurationSeconds != null
        ? `${targetDurationSeconds} sec`
        : meta?.defaultReps ?? ""),
    loggingMode: resolved.defaultSetMode,
    targetDurationSeconds,
  };
}

function sectionAllAddressed(logs: ExerciseLog[]): boolean {
  return logs.length > 0 && logs.every((e) => e.completed || e.skipped);
}

export const MAX_WORKOUT_ROUNDS = MAX_DAY_ROUNDS;

function renumberRoundLogs(rounds: RoundLog[]): RoundLog[] {
  return rounds.map((round, index) => ({
    ...round,
    roundNumber: index + 1,
  }));
}

function roundExercisesFromLogs(logs: ExerciseLog[]): RoundExercise[] {
  return logs.map((ex) => {
    const meta = exerciseMap[ex.exerciseId];
    return {
      exerciseId: ex.exerciseId,
      targetReps: ex.targetPrescription ?? meta?.defaultReps ?? "",
      category: (meta?.category ?? "CB") as ExerciseCategory,
    };
  });
}

function freshExerciseLogsFromCopy(
  sourceLogs: ExerciseLog[],
  mode: RoundCopyMode,
  usedInDay: ReadonlySet<string>,
  prefs: RoundCopyPrefs,
): ExerciseLog[] {
  if (mode === "repeat") {
    return sourceLogs.map((ex) => ({
      exerciseId: ex.exerciseId,
      completed: false,
      skipped: false,
      targetPrescription: ex.targetPrescription,
      loggingMode: ex.loggingMode,
      targetDurationSeconds: ex.targetDurationSeconds,
    }));
  }

  const slots = roundExercisesFromLogs(sourceLogs);
  const copied = structureRoundExercises(slots, usedInDay, prefs);
  return copied.map((slot) => {
    const log = buildStrengthExerciseLog(slot.exerciseId);
    return {
      ...log,
      targetPrescription: slot.targetReps || log.targetPrescription,
    };
  });
}

function usedExerciseIdsInWorkout(
  rounds: readonly RoundLog[],
  skipRoundIndex?: number,
): Set<string> {
  const used = new Set<string>();
  rounds.forEach((round, index) => {
    if (index === skipRoundIndex) return;
    for (const ex of round.exercises) {
      used.add(ex.exerciseId);
    }
  });
  return used;
}

/** Insert an empty round at `insertAt` (0-based index). */
export function insertEmptyRoundAt(
  log: WorkoutLog,
  insertAt: number,
): WorkoutLog {
  if (log.rounds.length >= MAX_WORKOUT_ROUNDS) return log;
  const at = Math.max(0, Math.min(insertAt, log.rounds.length));
  const rounds = [...log.rounds];
  rounds.splice(at, 0, { roundNumber: at + 1, exercises: [] });
  return { ...log, rounds: renumberRoundLogs(rounds) };
}

/** Insert a round at `insertAt`, copying from `sourceRoundNumber` (1-based). */
export function insertRoundCopyAt(
  log: WorkoutLog,
  insertAt: number,
  sourceRoundNumber: number,
  mode: RoundCopyMode,
  prefs: RoundCopyPrefs,
): WorkoutLog {
  if (log.rounds.length >= MAX_WORKOUT_ROUNDS) return log;
  const sourceIndex = log.rounds.findIndex(
    (r) => r.roundNumber === sourceRoundNumber,
  );
  if (sourceIndex < 0) return log;

  const source = log.rounds[sourceIndex]!;
  const at = Math.max(0, Math.min(insertAt, log.rounds.length));
  const usedInDay = usedExerciseIdsInWorkout(log.rounds);
  const exercises = freshExerciseLogsFromCopy(
    source.exercises,
    mode,
    usedInDay,
    prefs,
  );

  const rounds = [...log.rounds];
  rounds.splice(at, 0, { roundNumber: at + 1, exercises });
  return { ...log, rounds: renumberRoundLogs(rounds) };
}

/** Replace target round with a copy from the prior round (`roundNumber` is 1-based). */
export function applyRoundCopyFromPriorInWorkout(
  log: WorkoutLog,
  roundNumber: number,
  mode: RoundCopyMode,
  prefs: RoundCopyPrefs,
): WorkoutLog {
  const targetIndex = log.rounds.findIndex((r) => r.roundNumber === roundNumber);
  if (targetIndex <= 0) return log;

  const source = log.rounds[targetIndex - 1];
  if (!source) return log;

  const usedInDay = usedExerciseIdsInWorkout(log.rounds, targetIndex);
  const exercises = freshExerciseLogsFromCopy(
    source.exercises,
    mode,
    usedInDay,
    prefs,
  );

  const rounds = log.rounds.map((round, index) =>
    index === targetIndex ? { ...round, exercises } : round,
  );
  return { ...log, rounds };
}

export function addRoundAt(log: WorkoutLog): WorkoutLog {
  if (log.rounds.length >= MAX_WORKOUT_ROUNDS) return log;
  const nextNumber =
    log.rounds.length === 0
      ? 1
      : Math.max(...log.rounds.map((r) => r.roundNumber)) + 1;
  return {
    ...log,
    rounds: [...log.rounds, { roundNumber: nextNumber, exercises: [] }],
  };
}

export function removeRoundAt(
  log: WorkoutLog,
  roundNumber: number,
): WorkoutLog {
  if (log.rounds.length <= 1) return log;
  const remaining = log.rounds
    .filter((r) => r.roundNumber !== roundNumber)
    .map((r, index) => ({ ...r, roundNumber: index + 1 }));
  return { ...log, rounds: remaining };
}

export function removeRoundExerciseAt(
  log: WorkoutLog,
  roundNumber: number,
  slotIndex: number,
): WorkoutLog {
  const rounds = log.rounds.map((r) => {
    if (r.roundNumber !== roundNumber) return r;
    return {
      ...r,
      exercises: r.exercises.filter((_, i) => i !== slotIndex),
    };
  });
  return { ...log, rounds };
}

function addRoundExerciseAt(
  log: WorkoutLog,
  roundNumber: number,
  exerciseId: string,
): WorkoutLog {
  const rounds = log.rounds.map((r) => {
    if (r.roundNumber !== roundNumber) return r;
    if (r.exercises.some((e) => e.exerciseId === exerciseId && !e.swappedWith)) {
      return r;
    }
    return {
      ...r,
      exercises: [...r.exercises, buildStrengthExerciseLog(exerciseId)],
    };
  });
  return { ...log, rounds };
}

export function removeWarmUpStretchAt(
  log: WorkoutLog,
  exerciseId: string,
): WorkoutLog {
  const warmUpExercises = log.warmUpExercises.filter(
    (e) => e.exerciseId !== exerciseId,
  );
  return {
    ...log,
    warmUpExercises,
    warmUpCompleted: sectionAllAddressed(warmUpExercises),
  };
}

export function addWarmUpStretch(
  log: WorkoutLog,
  exerciseId: string,
): WorkoutLog {
  if (log.warmUpExercises.some((e) => e.exerciseId === exerciseId)) {
    return log;
  }
  const warmUpExercises = [
    ...log.warmUpExercises,
    buildStretchExerciseLogFromId(exerciseId),
  ];
  return {
    ...log,
    warmUpExercises,
    warmUpCompleted: sectionAllAddressed(warmUpExercises),
  };
}

export function removeCoolDownStretchAt(
  log: WorkoutLog,
  exerciseId: string,
): WorkoutLog {
  const coolDownExercises = log.coolDownExercises.filter(
    (e) => e.exerciseId !== exerciseId,
  );
  return {
    ...log,
    coolDownExercises,
    coolDownCompleted: sectionAllAddressed(coolDownExercises),
  };
}

function addCoolDownStretch(
  log: WorkoutLog,
  exerciseId: string,
): WorkoutLog {
  if (log.coolDownExercises.some((e) => e.exerciseId === exerciseId)) {
    return log;
  }
  const coolDownExercises = [
    ...log.coolDownExercises,
    buildStretchExerciseLogFromId(exerciseId),
  ];
  return {
    ...log,
    coolDownExercises,
    coolDownCompleted: sectionAllAddressed(coolDownExercises),
  };
}

export function removeCardioAt(log: WorkoutLog, instanceKey: string): WorkoutLog {
  const rows = ensureCardioExercises(log).filter(
    (e) => cardioRowKey(e) !== instanceKey,
  );
  return { ...log, cardioExercises: rows.length > 0 ? rows : undefined };
}

/** Always appends a new session (multiple walks per day allowed). */
export function addCardioKind(log: WorkoutLog, kind: CardioActivityKind): WorkoutLog {
  return appendCardioKindInstance(log, kind);
}
