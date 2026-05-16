import { collectDislikedIds } from "@/lib/exerciseCandidates";
import {
  resolveDefaultCoolDownFromSettings,
  resolveDefaultWarmUpFromSettings,
} from "@/lib/stretchDefaults";
import { useAuthStore } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { StretchEntry } from "@/types";

export type StretchResolveContext = {
  defaultWarmUp: StretchEntry[];
  defaultCoolDown: StretchEntry[];
  dislikedExerciseIds: ReadonlySet<string>;
};

/** Sync context for stores / workout start (non-React). */
export function buildStretchResolveContext(): StretchResolveContext {
  const settings = useSettingsStore.getState();
  const mode = useAuthStore.getState().mode;
  const useCatalogIfEmpty = mode === "guest";
  const dislikedExerciseIds = collectDislikedIds(
    useExercisePreferencesStore.getState().byExerciseId,
  );
  return {
    defaultWarmUp: resolveDefaultWarmUpFromSettings(
      settings.defaultWarmUp,
      dislikedExerciseIds,
      useCatalogIfEmpty,
    ),
    defaultCoolDown: resolveDefaultCoolDownFromSettings(
      settings.defaultCoolDown,
      dislikedExerciseIds,
      useCatalogIfEmpty,
    ),
    dislikedExerciseIds,
  };
}
