import { exerciseMap } from "@/data/exercises";
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
import type {
  CardioActivityKind,
  ExerciseCategory,
  ExerciseLog,
  WorkoutLog,
} from "@/types";

function seedTimerTargetSeconds(
  resolved: ReturnType<typeof resolveExerciseSettings>,
): number | undefined {
  if (resolved.defaultSetMode !== "timer") return undefined;
  const sec = resolved.defaultTimerSeconds ?? DEFAULT_TIMER_SECONDS_FALLBACK;
  return Math.min(999, Math.max(5, sec));
}

export function buildStrengthExerciseLog(exerciseId: string): ExerciseLog {
  const meta = exerciseMap[exerciseId];
  const stored = undefined;
  const resolved = resolveExerciseSettings(
    meta ?? {
      id: exerciseId,
      isTimeBased: false,
      category: "CB",
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

export function buildStretchExerciseLogFromId(
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

export const MAX_WORKOUT_ROUNDS = 6;

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

export function addRoundExerciseAt(
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

export function addCoolDownStretch(
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
