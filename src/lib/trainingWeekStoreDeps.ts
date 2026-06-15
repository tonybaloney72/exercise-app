import {
  selectEquipmentDependencyKey,
  selectStretchDefaultsKey,
  selectTrainingWeekCacheKey,
} from "@/lib/planResolverDeps";
import type { AuthMode } from "@/core";
import type { UserSettings } from "@/types";

export type TrainingWeekStoreDeps = {
  planRevision: number;
  equipmentKey: string;
  programProfileKey: string;
  stretchDefaultsKey: string;
};

export function trainingWeekStoreDepsFromSettings(
  mode: AuthMode,
  planRevision: number,
  settings: UserSettings,
): TrainingWeekStoreDeps {
  return {
    planRevision,
    equipmentKey: selectEquipmentDependencyKey(settings),
    programProfileKey: selectTrainingWeekCacheKey(settings),
    stretchDefaultsKey: selectStretchDefaultsKey(settings),
  };
}
