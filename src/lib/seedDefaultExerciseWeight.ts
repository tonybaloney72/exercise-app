import { exerciseMap } from "@/core/catalog";
import { sanitizeWeightLb } from "@/lib/exerciseLoad";
import type { ExerciseSettingsMap } from "@/lib/repos";
import type {
  Exercise,
  ExerciseLog,
  ExerciseSettingsValues,
  WorkoutLog,
} from "@/types";
import { effectiveExerciseId } from "@/utils/exerciseLogDefaults";
import { resolveExerciseSettings } from "@/utils/effectiveExerciseSettings";

export function hasStoredDefaultWeight(
  stored: ExerciseSettingsValues | undefined,
): boolean {
  return stored?.defaultWeightLb != null && stored.defaultWeightLb > 0;
}

/**
 * Build Library settings that set `defaultWeightLb` only when none is stored yet.
 * Returns null when there is nothing to seed.
 */
export function buildSeedDefaultWeightSettings(
  stored: ExerciseSettingsValues | undefined,
  weightLb: number,
  exercise?: Pick<Exercise, "isTimeBased" | "defaultReps">,
): ExerciseSettingsValues | null {
  if (hasStoredDefaultWeight(stored)) return null;
  const weight = sanitizeWeightLb(weightLb);
  if (weight == null) return null;

  const resolved = resolveExerciseSettings(
    exercise ?? { isTimeBased: false, defaultReps: "" },
    stored,
  );

  return {
    ...stored,
    defaultSetMode: resolved.defaultSetMode,
    defaultTimerSeconds:
      resolved.defaultSetMode === "timer"
        ? (stored?.defaultTimerSeconds ??
          resolved.defaultTimerSeconds ??
          null)
        : null,
    defaultTargetReps:
      resolved.defaultSetMode === "reps"
        ? (stored?.defaultTargetReps ?? resolved.defaultTargetReps ?? null)
        : null,
    defaultWeightLb: weight,
  };
}

function logsInWorkout(workout: WorkoutLog): ExerciseLog[] {
  const out: ExerciseLog[] = [];
  for (const log of workout.cardioExercises ?? []) out.push(log);
  for (const log of workout.warmUpExercises) out.push(log);
  for (const round of workout.rounds) {
    for (const log of round.exercises) out.push(log);
  }
  for (const log of workout.coolDownExercises) out.push(log);
  return out;
}

/**
 * First positive `weightLb` per exercise in a workout, only where Library has
 * no default weight yet.
 */
export function collectDefaultWeightSeeds(
  workout: WorkoutLog,
  settings: ExerciseSettingsMap,
): { exerciseId: string; weightLb: number }[] {
  const seen = new Set<string>();
  const out: { exerciseId: string; weightLb: number }[] = [];

  for (const log of logsInWorkout(workout)) {
    if (log.skipped || !log.completed) continue;
    const weight = sanitizeWeightLb(log.weightLb);
    if (weight == null) continue;

    const exerciseId = effectiveExerciseId(log);
    if (seen.has(exerciseId)) continue;
    seen.add(exerciseId);

    if (hasStoredDefaultWeight(settings[exerciseId])) continue;
    out.push({ exerciseId, weightLb: weight });
  }

  return out;
}

export function buildSeedDefaultWeightSettingsForExercise(
  exerciseId: string,
  weightLb: number,
  stored: ExerciseSettingsValues | undefined,
): ExerciseSettingsValues | null {
  return buildSeedDefaultWeightSettings(
    stored,
    weightLb,
    exerciseMap[exerciseId],
  );
}
