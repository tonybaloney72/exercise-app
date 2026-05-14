import { clearLocalData, localExerciseSettingsRepo, localSettingsRepo, localWorkoutRepo } from "@/lib/repos/local";
import {
  supabaseExerciseSettingsRepo,
  supabaseSettingsRepo,
  supabaseWorkoutRepo,
} from "@/lib/repos/supabase";
import { hydrateWorkoutLog } from "@/utils/exerciseLogDefaults";

const MIGRATION_FLAG_PREFIX = "exercise-app-migrated-";

function flagKey(userId: string): string {
  return `${MIGRATION_FLAG_PREFIX}${userId}`;
}

/**
 * Ports any localStorage data into Supabase the first time a user signs in
 * on this device, then clears local data. Idempotent: a per-user flag in
 * localStorage prevents this from running twice on the same device.
 *
 * Strategy is "local data wins by id" — uuid collisions are unrealistic,
 * so cloud data is preserved and local data is added. After this runs,
 * localStorage is reserved for guest mode only.
 */
export async function migrateLocalDataIfNeeded(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(flagKey(userId)) === "1") return;

  try {
    const [localHistory, localSettings, localExerciseSettings] =
      await Promise.all([
        localWorkoutRepo.loadHistory(),
        localSettingsRepo.load(),
        localExerciseSettingsRepo.loadAll(),
      ]);

    // Always upsert settings (defaults are harmless if the user never customized).
    await supabaseSettingsRepo.save(localSettings);

    for (const [exerciseId, values] of Object.entries(localExerciseSettings)) {
      try {
        await supabaseExerciseSettingsRepo.upsert(exerciseId, values);
      } catch (err) {
        console.error(
          "[migrateLocalDataIfNeeded] failed exercise_settings",
          exerciseId,
          err,
        );
      }
    }

    for (const log of localHistory) {
      try {
        await supabaseWorkoutRepo.saveWorkout(hydrateWorkoutLog(log));
      } catch (err) {
        console.error("[migrateLocalDataIfNeeded] failed to save workout", log.id, err);
        // Keep going — partial migration is better than aborting halfway.
      }
    }

    clearLocalData();
    localStorage.setItem(flagKey(userId), "1");
  } catch (err) {
    console.error("[migrateLocalDataIfNeeded] aborted", err);
    // Don't set the flag — try again next session.
  }
}
