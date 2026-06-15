import { computePrefsFingerprintFromSettings } from "@/lib/planGenerator";
import { settingsSliceFromUserSettings } from "@/lib/planGeneratorInputsSlice";
import {
  getExercisePreferenceRepo,
  getExerciseSettingsRepo,
  getSettingsRepo,
  type ExercisePreferenceMap,
  type ExerciseSettingsMap,
} from "@/lib/repos";
import type { AuthMode } from "@/core";
import { repoAuthMode } from "@/core";
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

type PlanGeneratorInputsStoreReader = (mode: AuthMode) => PlanGeneratorInputs | null;

let readGeneratorInputsFromStores: PlanGeneratorInputsStoreReader | null = null;

/** Registered at client bootstrap so plan resolution can read hydrated Zustand state. */
export function registerPlanGeneratorInputsStoreReader(
  reader: PlanGeneratorInputsStoreReader,
): void {
  readGeneratorInputsFromStores = reader;
}

/** Generator inputs from Zustand when hydrated, otherwise from repos. */
export async function loadGeneratorInputs(
  mode: AuthMode,
): Promise<PlanGeneratorInputs> {
  if (typeof window !== "undefined" && readGeneratorInputsFromStores) {
    const fromStores = readGeneratorInputsFromStores(mode);
    if (fromStores) return fromStores;
  }

  const repoMode = repoAuthMode(mode);
  const [prefs, settings, exerciseSettings] = await Promise.all([
    getExercisePreferenceRepo(repoMode).loadAll(),
    getSettingsRepo(repoMode).load(),
    getExerciseSettingsRepo(repoMode).loadAll(),
  ]);
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
