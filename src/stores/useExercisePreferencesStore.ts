"use client";

import { create } from "zustand";
import type { ExercisePreferenceKind } from "@/types";
import { getExercisePreferenceRepo } from "@/lib/repos";
import type { ExercisePreferenceMap } from "@/lib/repos";
import { useAuthStore } from "@/stores/useAuthStore";

type ExercisePreferencesState = {
  byExerciseId: ExercisePreferenceMap;
  load: () => Promise<void>;
  setPreference: (
    exerciseId: string,
    preference: ExercisePreferenceKind | null,
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

    setPreference: async (exerciseId, preference) => {
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
        console.error("[useExercisePreferencesStore.setPreference]", err);
        set({ byExerciseId: prev });
      }
    },
  }),
);
