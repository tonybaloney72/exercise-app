"use client";

import {
  buildSeedDefaultWeightSettingsForExercise,
  collectDefaultWeightSeeds,
} from "@/lib/seedDefaultExerciseWeight";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import type { WorkoutLog } from "@/types";

/** Persist Library defaultWeightLb the first time a positive weight is logged. */
export async function seedDefaultWeightIfUnset(
  exerciseId: string,
  weightLb: number,
): Promise<void> {
  const store = useExerciseSettingsStore.getState();
  const next = buildSeedDefaultWeightSettingsForExercise(
    exerciseId,
    weightLb,
    store.byExerciseId[exerciseId],
  );
  if (!next) return;
  await store.upsert(exerciseId, next);
}

/** After workout complete: seed defaults from first logged weights where unset. */
export async function seedDefaultWeightsFromWorkout(
  workout: WorkoutLog,
): Promise<void> {
  const store = useExerciseSettingsStore.getState();
  const seeds = collectDefaultWeightSeeds(workout, store.byExerciseId);
  for (const seed of seeds) {
    const next = buildSeedDefaultWeightSettingsForExercise(
      seed.exerciseId,
      seed.weightLb,
      store.byExerciseId[seed.exerciseId],
    );
    if (!next) continue;
    await store.upsert(seed.exerciseId, next);
  }
}
