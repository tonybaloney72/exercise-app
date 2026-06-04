import {
  buildStretchResolveContextFromInputs,
  type StretchResolveContext,
} from "@/lib/stretchResolveContext";
import { resolveTrainingPriorityScores } from "@/lib/trainingPriorities";
import { useAuthStore } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { getWeekDateKeys } from "@/utils/weekCalendar";

/** Sync context for stores / workout start (non-React). */
export function buildStretchResolveContext(): StretchResolveContext {
  return buildStretchResolveContextFromInputs({
    defaultWarmUp: useSettingsStore.getState().defaultWarmUp,
    defaultCoolDown: useSettingsStore.getState().defaultCoolDown,
    authMode: useAuthStore.getState().mode,
    exercisePreferences: useExercisePreferencesStore.getState().byExerciseId,
    trainingPriorityPreset: useSettingsStore.getState().trainingPriorityPreset,
    trainingPriorityScores: resolveTrainingPriorityScores(useSettingsStore.getState()),
    trainingPriorityCustomized:
      useSettingsStore.getState().trainingPriorityCustomized,
    weekRotationKey: getWeekDateKeys()[0],
  });
}
