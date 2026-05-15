"use client";

import { create } from "zustand";
import type { Exercise, ExerciseSettingsValues } from "@/types";
import { getExerciseSettingsRepo } from "@/lib/repos";
import type { ExerciseSettingsMap } from "@/lib/repos";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  resolveExerciseSettings,
  type ResolvedExerciseSettings,
} from "@/utils/effectiveExerciseSettings";

type ExerciseSettingsState = {
  byExerciseId: ExerciseSettingsMap;
  load: () => Promise<void>;
  upsert: (exerciseId: string, values: ExerciseSettingsValues) => Promise<void>;
  getStored: (exerciseId: string) => ExerciseSettingsValues | undefined;
  resolveForExercise: (
    exercise: Pick<Exercise, "id" | "isTimeBased" | "defaultReps">,
  ) => ResolvedExerciseSettings;
};

export const useExerciseSettingsStore = create<ExerciseSettingsState>(
  (set, get) => ({
    byExerciseId: {},

    getStored: (exerciseId) => get().byExerciseId[exerciseId],

    resolveForExercise: (exercise) =>
      resolveExerciseSettings(exercise, get().byExerciseId[exercise.id]),

    load: async () => {
      const mode = useAuthStore.getState().mode;
      if (mode === "loading") return;
      try {
        const map = await getExerciseSettingsRepo(mode).loadAll();
        set({ byExerciseId: map });
      } catch (err) {
        console.error("[useExerciseSettingsStore.load]", err);
      }
    },

    upsert: async (exerciseId, values) => {
      const mode = useAuthStore.getState().mode;
      if (mode === "loading") return;

      const prev = get().byExerciseId;
      set({
        byExerciseId: {
          ...prev,
          [exerciseId]: values,
        },
      });

      try {
        await getExerciseSettingsRepo(mode).upsert(exerciseId, values);
      } catch (err) {
        console.error("[useExerciseSettingsStore.upsert]", err);
        try {
          const map = await getExerciseSettingsRepo(mode).loadAll();
          set({ byExerciseId: map });
        } catch {
          set({ byExerciseId: prev });
        }
      }
    },
  }),
);

export type { ResolvedExerciseSettings } from "@/utils/effectiveExerciseSettings";