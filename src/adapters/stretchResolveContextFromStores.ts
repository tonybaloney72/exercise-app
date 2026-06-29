import {
  buildStretchResolveContextFromInputs,
  type StretchResolveContext,
} from "@/lib/stretchResolveContext";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { getWeekDateKeys } from "@/utils/weekCalendar";

/** Sync stretch context from hydrated Zustand stores (non-React call sites). */
export function buildStretchResolveContextFromStores(): StretchResolveContext {
  const settings = useSettingsStore.getState();
  return buildStretchResolveContextFromInputs({
    warmUpStretchCount: settings.warmUpStretchCount,
    coolDownStretchCount: settings.coolDownStretchCount,
    exercisePreferences: useExercisePreferencesStore.getState().byExerciseId,
    weekRotationKey: getWeekDateKeys()[0],
  });
}
