import {
  clearLocalData,
  localExerciseSettingsRepo,
  localSettingsRepo,
  localWorkoutRepo,
} from "@/lib/repos/local";
import {
  hasLocalStoredSettings,
  mergeMigratedSettings,
} from "@/lib/auth/mergeMigratedSettings";
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
 * Settings: only written when this profile has guest settings in localStorage.
 * Cloud `equipment_onboarding_completed` is never downgraded by defaults.
 */
export async function migrateLocalDataIfNeeded(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(flagKey(userId)) === "1") return;

  try {
    const [localHistory, localExerciseSettings] = await Promise.all([
      localWorkoutRepo.loadHistory(),
      localExerciseSettingsRepo.loadAll(),
    ]);

    if (hasLocalStoredSettings()) {
      const [cloudSettings, localSettings] = await Promise.all([
        supabaseSettingsRepo.load(),
        localSettingsRepo.load(),
      ]);
      await supabaseSettingsRepo.save(
        mergeMigratedSettings(cloudSettings, localSettings),
      );
    }

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
      }
    }

    clearLocalData();
    localStorage.setItem(flagKey(userId), "1");
  } catch (err) {
    console.error("[migrateLocalDataIfNeeded] aborted", err);
  }
}
