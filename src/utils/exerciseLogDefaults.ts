import type { ExerciseLog, WorkoutLog, ExerciseSetMode } from "@/types";
import { exerciseMap } from "@/core/catalog";
import { ensureCardioInstanceIds } from "@/lib/cardioInstances";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  resolveExerciseSettings,
} from "@/utils/effectiveExerciseSettings";

function extractPositiveInts(s: string): number[] {
  return (s.match(/\d+/g) ?? [])
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

function effectiveLoggingMode(log: ExerciseLog): ExerciseSetMode {
  if (log.loggingMode) return log.loggingMode;
  const id = effectiveExerciseId(log);
  const meta = exerciseMap[id];
  if (!meta) return "reps";
  const stored = useExerciseSettingsStore.getState().byExerciseId[id];
  return resolveExerciseSettings(meta, stored).defaultSetMode;
}

/**
 * Derive stored metrics from the plan prescription string (e.g. "12", "10 each",
 * "20–30 sec") and whether the exercise is time-based in the library.
 */
function metricsFromPrescription(
  prescription: string,
  isTimeBased: boolean,
): { actualReps?: number; actualDuration?: number } {
  const nums = extractPositiveInts(prescription);
  if (nums.length === 0) return {};

  const n = Math.max(...nums);
  if (isTimeBased) {
    return { actualDuration: n };
  }
  return { actualReps: n };
}

export function effectiveExerciseId(log: ExerciseLog): string {
  return log.swappedWith ?? log.exerciseId;
}

export function resolvePrescriptionText(log: ExerciseLog): string {
  const direct = log.targetPrescription?.trim();
  if (direct) return direct;
  const meta = exerciseMap[effectiveExerciseId(log)];
  return meta?.defaultReps?.trim() ?? "";
}

/**
 * Clears logged metrics (e.g. when un-completing or skipping).
 */
export function clearExerciseMetrics(log: ExerciseLog): ExerciseLog {
  return {
    ...log,
    actualReps: undefined,
    actualDuration: undefined,
  };
}

/**
 * Ensures completed, non-skipped exercises always have `actualReps` and/or
 * `actualDuration` populated from prescription + library metadata.
 */
function ensureExerciseMetrics(log: ExerciseLog): ExerciseLog {
  if (!log.completed || log.skipped) return log;
  if (log.actualReps != null || log.actualDuration != null) return log;

  const id = effectiveExerciseId(log);
  const prescription = resolvePrescriptionText(log);
  const mode = effectiveLoggingMode(log);

  if (mode === "timer") {
    if (
      log.targetDurationSeconds != null &&
      log.targetDurationSeconds > 0
    ) {
      return { ...log, actualDuration: log.targetDurationSeconds };
    }
    const parsed = metricsFromPrescription(prescription, true);
    if (parsed.actualDuration != null) {
      return { ...log, ...parsed };
    }
    const meta = exerciseMap[id];
    const stored = useExerciseSettingsStore.getState().byExerciseId[id];
    const resolved = resolveExerciseSettings(
      meta ?? {
        id,
        isTimeBased: false,
        category: "UP",
        name: "",
        defaultReps: "",
        notes: "",
      },
      stored,
    );
    if (
      resolved.defaultSetMode === "timer" &&
      resolved.defaultTimerSeconds != null &&
      resolved.defaultTimerSeconds > 0
    ) {
      return { ...log, actualDuration: resolved.defaultTimerSeconds };
    }
    return { ...log, actualDuration: DEFAULT_TIMER_SECONDS_FALLBACK };
  }

  const meta = exerciseMap[id];
  const st = useExerciseSettingsStore.getState().byExerciseId[id];
  const resolved = resolveExerciseSettings(
    meta ?? {
      id,
      isTimeBased: false,
      category: "UP",
      name: "",
      defaultReps: "",
      notes: "",
    },
    st,
  );
  if (
    mode === "reps" &&
    resolved.defaultTargetReps != null &&
    resolved.defaultTargetReps > 0
  ) {
    return { ...log, actualReps: resolved.defaultTargetReps };
  }

  const parsed = metricsFromPrescription(prescription, false);
  if (parsed.actualReps != null || parsed.actualDuration != null) {
    return { ...log, ...parsed };
  }

  return { ...log, actualReps: 1 };
}

export function hydrateWorkoutLog(log: WorkoutLog): WorkoutLog {
  const withCardio = ensureCardioInstanceIds(log);
  return {
    ...withCardio,
    warmUpExercises: withCardio.warmUpExercises.map(ensureExerciseMetrics),
    coolDownExercises: withCardio.coolDownExercises.map(ensureExerciseMetrics),
    rounds: withCardio.rounds.map((r) => ({
      ...r,
      exercises: r.exercises.map(ensureExerciseMetrics),
    })),
  };
}
