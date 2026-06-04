"use client";

import { create } from "zustand";
import type { ExercisePreferenceKind } from "@/types";
import { getExercisePreferenceRepo } from "@/lib/repos";
import type { ExercisePreferenceMap } from "@/lib/repos";
import { refreshCurrentTrainingWeek } from "@/lib/trainingWeekRefresh";
import { useAuthStore } from "@/stores/useAuthStore";
import type { TrainingWeekRefreshReason } from "@/stores/useTrainingWeekRefreshStore";
import { toastSaveError, toastSavePartialWarning } from "@/utils/saveErrorToast";

type SetExercisePreferenceOptions = {
  /**
   * When false, only saves the preference (no week regen / plan refetch).
   * Use during an active workout so the session UI stays stable.
   * @default true
   */
  refreshGeneratedWeek?: boolean;
};

type ExercisePreferencesState = {
  byExerciseId: ExercisePreferenceMap;
  load: () => Promise<void>;
  setPreference: (
    exerciseId: string,
    preference: ExercisePreferenceKind | null,
    options?: SetExercisePreferenceOptions,
  ) => Promise<void>;
};

export const useExercisePreferencesStore = create<ExercisePreferencesState>(
  (set, get) => ({
    byExerciseId: {},
    load: async () => {
      const mode = useAuthStore.getState().mode;
      if (mode === "loading") return;
      if (mode === "guest") {
        set({ byExerciseId: {} });
        return;
      }
      try {
        const map = await getExercisePreferenceRepo(mode).loadAll();
        set({ byExerciseId: map });
      } catch (err) {
        console.error("[useExercisePreferencesStore.load]", err);
      }
    },

    setPreference: async (exerciseId, preference, options) => {
      const mode = useAuthStore.getState().mode;
      if (mode !== "authenticated") return;

      const prev = get().byExerciseId;
      const optimistic: ExercisePreferenceMap = { ...prev };
      if (preference == null) {
        delete optimistic[exerciseId];
      } else {
        optimistic[exerciseId] = preference;
      }
      set({ byExerciseId: optimistic });

      try {
        await getExercisePreferenceRepo(mode).setPreference(
          exerciseId,
          preference,
        );
      } catch (err) {
        toastSaveError("exercise preference", err);
        set({ byExerciseId: prev });
        return;
      }

      const was = prev[exerciseId];
      const affectsDislikes =
        preference === "disliked" || was === "disliked";
      const affectsFavorites =
        preference === "favorite" || was === "favorite";

      const shouldRefreshWeek = options?.refreshGeneratedWeek !== false;
      if (shouldRefreshWeek && (affectsDislikes || affectsFavorites)) {
        const reason: TrainingWeekRefreshReason = affectsDislikes
          ? "dislike"
          : "favorite";
        try {
          await refreshCurrentTrainingWeek(reason);
        } catch (err) {
          toastSavePartialWarning("Preference", err);
        }
      }
    },
  }),
);
