import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { computePrefsFingerprintFromSettings } from "@/lib/planGenerator";
import {
  getExercisePreferenceRepo,
  getExerciseSettingsRepo,
  getSettingsRepo,
  type ExercisePreferenceMap,
  type ExerciseSettingsMap,
} from "@/lib/repos";
import { settingsHydrationMatchesAuth } from "@/lib/settingsHydration";
import type { AuthMode } from "@/stores/useAuthStore";
import type {
  ExerciseEquipment,
  RoundDensity,
  TrainingPriorityPreset,
  UserSettings,
} from "@/types";

export type PlanGeneratorInputs = {
  prefs: ExercisePreferenceMap;
  settings: UserSettings;
  exerciseSettings: ExerciseSettingsMap;
  availableEquipment: ExerciseEquipment[];
  trainingPriorityPreset: TrainingPriorityPreset;
  roundDensity: RoundDensity;
  fingerprint: string;
};

function settingsSlice(settings: UserSettings): {
  availableEquipment: ExerciseEquipment[];
  trainingPriorityPreset: TrainingPriorityPreset;
  roundDensity: RoundDensity;
} {
  return {
    availableEquipment:
      settings.availableEquipment?.length > 0
        ? settings.availableEquipment
        : [...DEFAULT_AVAILABLE_EQUIPMENT],
    trainingPriorityPreset: settings.trainingPriorityPreset ?? "balanced",
    roundDensity: settings.roundDensity ?? "standard",
  };
}

function repoModeForPlans(mode: AuthMode): AuthMode {
  return mode === "authenticated" ? "authenticated" : "guest";
}

import { useAuthStore } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

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
    settingsSlice(settings);

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

/** Generator inputs from Zustand when hydrated, otherwise from repos. */
export async function loadGeneratorInputs(
  mode: AuthMode,
): Promise<PlanGeneratorInputs> {
  const fromStores = tryLoadGeneratorInputsFromStores(mode);
  if (fromStores) return fromStores;

  const repoMode = repoModeForPlans(mode);
  const [prefs, settings, exerciseSettings] = await Promise.all([
    getExercisePreferenceRepo(repoMode).loadAll(),
    getSettingsRepo(repoMode).load(),
    getExerciseSettingsRepo(repoMode).loadAll(),
  ]);
  const { availableEquipment, trainingPriorityPreset, roundDensity } =
    settingsSlice(settings);
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
