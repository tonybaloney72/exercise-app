import { TRAINING_WEEK_SOURCE_CUSTOM_V1 } from "@/lib/planGenerator";
import { trainingWeekStoreDepsFromSettings } from "@/lib/trainingWeekStoreDeps";
import type { TrainingWeekDays } from "@/lib/repos";
import type { AuthMode } from "@/core";
import type { UserSettings } from "@/types";
import {
  buildApplyCustomDaySavePayload,
  type ApplyCustomDaySavePayload,
} from "@/use-cases/trainingWeek/weekCache";

export type BumpPlansAfterCustomSavePorts = {
  getMode: () => AuthMode;
  getSettings: () => UserSettings;
  bumpPlanRevision: () => number;
  applySavedWeek: (payload: ApplyCustomDaySavePayload) => void;
};

/** Bump plan revision and merge a saved week into the session cache (no DB resolve). */
export function bumpPlansAfterCustomSave(
  dateKey: string,
  mergedWeek: TrainingWeekDays,
  ports: BumpPlansAfterCustomSavePorts,
): void {
  const mode = ports.getMode();
  if (mode === "loading") return;

  const planRevision = ports.bumpPlanRevision();
  const settings = ports.getSettings();
  const deps = trainingWeekStoreDepsFromSettings(mode, planRevision, settings);

  const payload = buildApplyCustomDaySavePayload({
    dateKey,
    mergedWeek,
    mode,
    weekSource: TRAINING_WEEK_SOURCE_CUSTOM_V1,
    ...deps,
  });
  if (!payload) return;

  ports.applySavedWeek({
    ...payload,
    weekSource: payload.weekSource ?? TRAINING_WEEK_SOURCE_CUSTOM_V1,
  });
}
