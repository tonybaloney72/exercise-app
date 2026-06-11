import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import type {
  ExerciseEquipment,
  RoundDensity,
  TrainingPriorityPreset,
  UserSettings,
} from "@/types";

export function settingsSliceFromUserSettings(settings: UserSettings): {
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
