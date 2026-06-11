import { computePrefsFingerprintFromSettings } from "@/lib/planGenerator";
import { settingsHydrationMatchesAuth } from "@/lib/settingsHydration";
import type { PlanGeneratorInputs } from "@/lib/planGeneratorInputs";
import { settingsSliceFromUserSettings } from "@/lib/planGeneratorInputsSlice";
import { useAuthStore } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { AuthMode } from "@/stores/useAuthStore";

/** Read generator inputs from hydrated Zustand stores when available (client only). */
export function tryLoadGeneratorInputsFromStores(
  mode: AuthMode,
): PlanGeneratorInputs | null {
  if (typeof window === "undefined" || mode === "loading") return null;

  const { mode: authMode, user } = useAuthStore.getState();
  const settingsState = useSettingsStore.getState();
  if (
    !settingsHydrationMatchesAuth(
      authMode,
      user?.id,
      settingsState.hydratedForAuthKey,
    )
  ) {
    return null;
  }

  const settings = settingsState;
  const exerciseSettings = useExerciseSettingsStore.getState().byExerciseId;
  const prefs = useExercisePreferencesStore.getState().byExerciseId;
  const { availableEquipment, trainingPriorityPreset, roundDensity } =
    settingsSliceFromUserSettings(settings);

  return {
    prefs,
    settings,
    exerciseSettings,
    availableEquipment,
    trainingPriorityPreset,
    roundDensity,
    fingerprint: computePrefsFingerprintFromSettings(prefs, settings),
  };
}
