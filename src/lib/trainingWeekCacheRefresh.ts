import { TRAINING_WEEK_SOURCE_CUSTOM_V1 } from "@/lib/planGenerator";
import { trainingWeekStoreDepsFromSettings } from "@/lib/trainingWeekStoreDeps";
import type { TrainingWeekDays } from "@/lib/repos";
import { applyCustomDaySaveToWeekCache } from "@/stores/useTrainingWeekStore";

/** Bump revision and merge saved week into the session cache (no DB resolve). */
export async function bumpTrainingWeekPlansAfterCustomSave(
  dateKey: string,
  mergedWeek: TrainingWeekDays,
): Promise<void> {
  const { useTrainingWeekRefreshStore } = await import(
    "@/stores/useTrainingWeekRefreshStore"
  );
  const { useAuthStore } = await import("@/stores/useAuthStore");
  const { useSettingsStore } = await import("@/stores/useSettingsStore");

  useTrainingWeekRefreshStore.getState().bumpPlanRevision();
  const planRevision = useTrainingWeekRefreshStore.getState().planRevision;
  const mode = useAuthStore.getState().mode;
  if (mode === "loading") return;

  const settings = useSettingsStore.getState();
  applyCustomDaySaveToWeekCache(
    dateKey,
    mergedWeek,
    { mode, ...trainingWeekStoreDepsFromSettings(mode, planRevision, settings) },
    TRAINING_WEEK_SOURCE_CUSTOM_V1,
  );
}
