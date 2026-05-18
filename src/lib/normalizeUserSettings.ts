import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import { sanitizeTrainingPriorityPreset } from "@/lib/trainingPriorities";
import type { UserSettings } from "@/types";

/** Merge partial settings and migrate legacy `programFocus` → `trainingPriorityPreset`. */
export function normalizeUserSettings(
  partial: Partial<UserSettings> = {},
): UserSettings {
  const preset = sanitizeTrainingPriorityPreset(
    partial.trainingPriorityPreset ?? partial.programFocus,
  );
  const { programFocus: _legacy, ...rest } = partial;
  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    trainingPriorityPreset: preset,
  };
}
