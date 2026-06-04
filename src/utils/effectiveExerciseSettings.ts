import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  parseRepTargetHint,
  parseTimerSecondsHint,
} from "@/lib/exercisePrescriptionHints";
import {
  scaledCatalogPrescription,
  scaledDefaultTimerSeconds,
  type PlanPrescriptionOptions,
} from "@/lib/prescriptionScaling";
import type { Exercise, ExerciseSetMode, ExerciseSettingsValues } from "@/types";

export type { PlanPrescriptionOptions } from "@/lib/prescriptionScaling";
export {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  parseRepTargetHint,
} from "@/lib/exercisePrescriptionHints";

/** Quick-select timer lengths (Library + future preset row in workout). */
export const TIMER_DURATION_PRESET_SECONDS = [30, 45, 60] as const;

export function isPresetTimerSeconds(sec: number): boolean {
  return (TIMER_DURATION_PRESET_SECONDS as readonly number[]).includes(sec);
}

export interface ResolvedExerciseSettings {
  defaultSetMode: ExerciseSetMode;
  /** Defined when `defaultSetMode === "timer"`. */
  defaultTimerSeconds?: number;
  /** Defined when `defaultSetMode === "reps"` and the user saved a default in Library. */
  defaultTargetReps?: number;
}

type StoredExerciseSlice = Pick<
  ExerciseSettingsValues,
  "defaultSetMode" | "defaultTimerSeconds" | "defaultTargetReps"
>;

/**
 * Merge catalog metadata with optional persisted per-user row.
 * No persisted row → mode follows `exercise.isTimeBased`; timer seconds default to 45.
 */
export function resolveExerciseSettings(
  exercise: Pick<Exercise, "isTimeBased" | "defaultReps">,
  stored: StoredExerciseSlice | undefined,
): ResolvedExerciseSettings {
  const defaultSetMode: ExerciseSetMode =
    stored?.defaultSetMode ?? (exercise.isTimeBased ? "timer" : "reps");

  if (defaultSetMode === "reps") {
    const fromStored =
      stored?.defaultTargetReps != null && stored.defaultTargetReps > 0
        ? Math.min(999, Math.round(stored.defaultTargetReps))
        : undefined;
    return { defaultSetMode: "reps", defaultTargetReps: fromStored };
  }

  const sec =
    stored?.defaultTimerSeconds != null && stored.defaultTimerSeconds > 0
      ? stored.defaultTimerSeconds
      : DEFAULT_TIMER_SECONDS_FALLBACK;

  return { defaultSetMode: "timer", defaultTimerSeconds: sec };
}

/**
 * Planned stretch countdown for an active workout: Library defaults win over
 * routine/catalog prescription text. Per-set adjustments in the workout win when
 * they differ from both library and the old prescription-derived seed.
 */
export function resolveStretchTimerTargetSeconds(
  exercise: Pick<Exercise, "isTimeBased" | "defaultReps">,
  stored: StoredExerciseSlice | undefined,
  logTargetSeconds: number | undefined,
  routinePrescription?: string,
): number {
  const resolved = resolveExerciseSettings(exercise, stored);
  const librarySec =
    resolved.defaultSetMode === "timer"
      ? (resolved.defaultTimerSeconds ?? DEFAULT_TIMER_SECONDS_FALLBACK)
      : DEFAULT_TIMER_SECONDS_FALLBACK;

  const raw =
    logTargetSeconds != null && logTargetSeconds > 0
      ? Math.min(999, logTargetSeconds)
      : undefined;

  if (raw == null) return librarySec;

  const rxSec =
    (routinePrescription
      ? parseTimerSecondsHint(routinePrescription)
      : undefined) ?? parseTimerSecondsHint(exercise.defaultReps);

  const hasLibraryOverride =
    stored?.defaultTimerSeconds != null && stored.defaultTimerSeconds > 0;

  if (
    hasLibraryOverride &&
    rxSec != null &&
    raw === rxSec &&
    raw !== librarySec
  ) {
    return librarySec;
  }

  if (hasLibraryOverride && raw === librarySec) return librarySec;

  if (raw !== librarySec) return raw;

  return librarySec;
}

/**
 * Prescription string for plan slots and previews (Library defaults over catalog).
 */
export function formatPlanTargetPrescription(
  exercise: Pick<Exercise, "isTimeBased" | "defaultReps" | "category">,
  stored: StoredExerciseSlice | undefined,
  options?: PlanPrescriptionOptions,
): string {
  const resolved = resolveExerciseSettings(exercise, stored);
  const expertiseByGroup = options?.expertiseByGroup;

  if (resolved.defaultSetMode === "timer") {
    const hasLibraryOverride =
      stored?.defaultTimerSeconds != null && stored.defaultTimerSeconds > 0;
    if (hasLibraryOverride) {
      return `${resolved.defaultTimerSeconds ?? DEFAULT_TIMER_SECONDS_FALLBACK} sec`;
    }
    const sec = scaledDefaultTimerSeconds(exercise, expertiseByGroup);
    return `${sec} sec`;
  }

  if (resolved.defaultTargetReps != null && resolved.defaultTargetReps > 0) {
    return String(resolved.defaultTargetReps);
  }

  return scaledCatalogPrescription(exercise, expertiseByGroup);
}
