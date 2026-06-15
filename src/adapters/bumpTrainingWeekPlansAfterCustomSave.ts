import { bumpPlansAfterCustomSave } from "@/use-cases/trainingWeek/bumpPlansAfterCustomSave";
import type { TrainingWeekDays } from "@/lib/repos";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useTrainingWeekRefreshStore } from "@/stores/useTrainingWeekRefreshStore";
import { useTrainingWeekStore } from "@/stores/useTrainingWeekStore";

/** Presentation wiring: bump revision and merge saved week into Zustand cache. */
export function bumpTrainingWeekPlansAfterCustomSave(
  dateKey: string,
  mergedWeek: TrainingWeekDays,
): void {
  bumpPlansAfterCustomSave(dateKey, mergedWeek, {
    getMode: () => useAuthStore.getState().mode,
    getSettings: () => useSettingsStore.getState(),
    bumpPlanRevision: () => {
      useTrainingWeekRefreshStore.getState().bumpPlanRevision();
      return useTrainingWeekRefreshStore.getState().planRevision;
    },
    applySavedWeek: (payload) => {
      useTrainingWeekStore.getState().applySavedWeek(
        payload.anchorKey,
        payload.depsKey,
        payload.planRevision,
        payload.weekByDow,
        payload.weekSource,
      );
    },
  });
}
