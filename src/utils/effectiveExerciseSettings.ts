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
import { sanitizeWeightLb } from "@/lib/exerciseLoad";
import type {
  Exercise,
  ExerciseSetMode,
  ExerciseSettingsValues,
} from "@/types";

export type { PlanPrescriptionOptions } from "@/lib/prescriptionScaling";
export {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  parseRepTargetHint,
} from "@/lib/exercisePrescriptionHints";

/** Quick-select timer lengths (Library + future preset row in workout). */
export const TIMER_DURATION_PRESET_SECONDS = [30, 45] as const;

export function isPresetTimerSeconds(sec: number): boolean {
  return (TIMER_DURATION_PRESET_SECONDS as readonly number[]).includes(sec);
}

export interface ResolvedExerciseSettings {
  defaultSetMode: ExerciseSetMode;
  /** Defined when `defaultSetMode === "timer"`. */
  defaultTimerSeconds?: number;
  /** Defined when `defaultSetMode === "reps"` and the user saved a default in Library. */
  defaultTargetReps?: number;
  /** Working load (lb) when the user saved a Library default. */
  defaultWeightLb?: number;
}

type StoredExerciseSlice = Pick<
  ExerciseSettingsValues,
  | "defaultSetMode"
  | "defaultTimerSeconds"
  | "defaultTargetReps"
  | "defaultWeightLb"
>;

/**
 * Merge catalog metadata with optional persisted per-user row.
 * No saved timer preference → catalog prescription (e.g. Cobra "20 sec"), not a
 * hard-coded 45s fallback that looks like a Library choice.
 */
export function resolveExerciseSettings(
  exercise: Pick<Exercise, "isTimeBased" | "defaultReps"> &
    Partial<Pick<Exercise, "category">>,
  stored: StoredExerciseSlice | undefined,
  options?: PlanPrescriptionOptions,
): ResolvedExerciseSettings {
  const defaultSetMode: ExerciseSetMode =
    stored?.defaultSetMode ?? (exercise.isTimeBased ? "timer" : "reps");

  const defaultWeightLb = sanitizeWeightLb(stored?.defaultWeightLb) ?? undefined;

  if (defaultSetMode === "reps") {
    const fromStored =
      stored?.defaultTargetReps != null && stored.defaultTargetReps > 0
        ? Math.min(999, Math.round(stored.defaultTargetReps))
        : undefined;
    return {
      defaultSetMode: "reps",
      defaultTargetReps: fromStored,
      defaultWeightLb,
    };
  }

  const sec =
    stored?.defaultTimerSeconds != null && stored.defaultTimerSeconds > 0
      ? stored.defaultTimerSeconds
      : exercise.category != null
        ? scaledDefaultTimerSeconds(
            {
              isTimeBased: exercise.isTimeBased,
              defaultReps: exercise.defaultReps,
              category: exercise.category,
            },
            options?.expertiseByGroup,
          )
        : (parseTimerSecondsHint(exercise.defaultReps) ??
          DEFAULT_TIMER_SECONDS_FALLBACK);

  return {
    defaultSetMode: "timer",
    defaultTimerSeconds: sec,
    defaultWeightLb,
  };
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
 * Label for the reps/timer target the user is working against.
 * Library defaults win over a frozen day-plan or catalog prescription (e.g. catalog
 * "8" must not hide a Library default of 10).
 */
export function resolveStrengthTargetLabel(
  exercise: Pick<Exercise, "isTimeBased" | "defaultReps" | "category">,
  stored: StoredExerciseSlice | undefined,
  sessionPrescription?: string,
  options?: PlanPrescriptionOptions,
): string {
  const resolved = resolveExerciseSettings(exercise, stored);
  if (resolved.defaultSetMode === "reps" && resolved.defaultTargetReps != null) {
    return String(resolved.defaultTargetReps);
  }
  if (resolved.defaultSetMode === "timer") {
    const hasLibraryOverride =
      stored?.defaultTimerSeconds != null && stored.defaultTimerSeconds > 0;
    if (hasLibraryOverride) {
      return formatPlanTargetPrescription(exercise, stored, options);
    }
  }
  const session = sessionPrescription?.trim();
  if (session) return session;
  return formatPlanTargetPrescription(exercise, stored, options);
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
