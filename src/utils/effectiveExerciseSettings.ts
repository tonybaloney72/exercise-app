import type { Exercise, ExerciseSetMode, ExerciseSettingsValues } from "@/types";

/** Seconds hint from prescription text (e.g. "30 sec", "20–30 sec each side"). */
export function parseTimerSecondsHint(prescription: string): number | undefined {
  const lower = prescription.toLowerCase();
  if (!lower.includes("sec")) return undefined;
  const nums = (prescription.match(/\d+/g) ?? [])
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
  if (nums.length === 0) return undefined;
  return Math.min(999, Math.max(5, Math.max(...nums)));
}

/** Best single-number hint from catalog prescription text (e.g. "12", "8–10"). */
export function parseRepTargetHint(defaultReps: string): number | undefined {
  const nums = (defaultReps.match(/\d+/g) ?? [])
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
  if (nums.length === 0) return undefined;
  return Math.min(999, Math.max(1, Math.max(...nums)));
}

/** When the user prefers timer mode but has not set a duration yet. */
export const DEFAULT_TIMER_SECONDS_FALLBACK = 45;

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
