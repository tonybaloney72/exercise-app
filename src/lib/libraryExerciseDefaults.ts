import type { ExerciseSettingsValues, ExerciseSetMode } from "@/types";
import { sanitizeWeightLb } from "@/lib/exerciseLoad";
import { parseRepTargetHint } from "@/lib/exercisePrescriptionHints";

/** Parse Library default-reps input; empty clears the override. */
export function parseLibraryDefaultRepsInput(
  raw: string,
  catalogDefaultReps: string,
): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  const fallback = parseRepTargetHint(catalogDefaultReps) ?? 1;
  const reps = Math.round(Number.isNaN(n) ? fallback : n);
  return Math.min(999, Math.max(1, reps));
}

/** Parse Library default-weight input; empty clears. Invalid non-empty → undefined. */
export function parseLibraryDefaultWeightInput(
  raw: string,
): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  return sanitizeWeightLb(Number(trimmed)) ?? undefined;
}

export function buildLibraryWeightSettings(
  defaultSetMode: ExerciseSetMode,
  stored: ExerciseSettingsValues | undefined,
  defaultWeightLb: number | null,
): ExerciseSettingsValues {
  return {
    defaultSetMode,
    defaultTimerSeconds: stored?.defaultTimerSeconds ?? null,
    defaultTargetReps: stored?.defaultTargetReps ?? null,
    defaultWeightLb,
  };
}
