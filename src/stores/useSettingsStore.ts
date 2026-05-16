"use client";

import { create } from "zustand";
import type { UserSettings } from "@/types";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { DEFAULT_SETTINGS, getSettingsRepo } from "@/lib/repos";
import { refreshCurrentTrainingWeek } from "@/lib/trainingWeekRefresh";
import {
  pruneStoredStretchDefaults,
  stretchListsEqual,
} from "@/lib/stretchDefaults";
import { useAuthStore } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import type { ExerciseEquipment } from "@/types";

interface SettingsState extends UserSettings {
  /** True after first `loadSettings` for the current auth mode. */
  hydrated: boolean;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  updateSettings: async (partial) => {
    const current = get();
    const updated: UserSettings = {
      restBetweenRounds: partial.restBetweenRounds ?? current.restBetweenRounds,
      weekStartDate: partial.weekStartDate ?? current.weekStartDate,
      darkMode: partial.darkMode ?? current.darkMode,
      timerSoundsEnabled:
        partial.timerSoundsEnabled ?? current.timerSoundsEnabled,
      timerVibrationEnabled:
        partial.timerVibrationEnabled ?? current.timerVibrationEnabled,
      keepScreenAwake: partial.keepScreenAwake ?? current.keepScreenAwake,
      availableEquipment:
        partial.availableEquipment ?? current.availableEquipment,
      programFocus: partial.programFocus ?? current.programFocus,
      roundDensity: partial.roundDensity ?? current.roundDensity,
      defaultWarmUp: partial.defaultWarmUp ?? current.defaultWarmUp,
      defaultCoolDown: partial.defaultCoolDown ?? current.defaultCoolDown,
    };
    const equipmentChanged =
      partial.availableEquipment != null &&
      !equipmentListsEqual(
        current.availableEquipment,
        partial.availableEquipment,
      );
    const programProfileChanged =
      (partial.programFocus != null &&
        partial.programFocus !== current.programFocus) ||
      (partial.roundDensity != null &&
        partial.roundDensity !== current.roundDensity);
    const stretchDefaultsChanged =
      (partial.defaultWarmUp != null &&
        !stretchListsEqual(current.defaultWarmUp, partial.defaultWarmUp)) ||
      (partial.defaultCoolDown != null &&
        !stretchListsEqual(current.defaultCoolDown, partial.defaultCoolDown));

    set(updated);
    try {
      await getSettingsRepo().save(updated);
    } catch (err) {
      console.error("[useSettingsStore.updateSettings]", err);
      return;
    }

    if (useAuthStore.getState().mode !== "authenticated") return;

    try {
      if (programProfileChanged) {
        await refreshCurrentTrainingWeek("program");
      } else if (equipmentChanged) {
        await refreshCurrentTrainingWeek("equipment");
      } else if (stretchDefaultsChanged) {
        await refreshCurrentTrainingWeek("program");
      }
    } catch (err) {
      console.error("[useSettingsStore.refreshWeek]", err);
    }
  },

  loadSettings: async () => {
    const mode = useAuthStore.getState().mode;
    if (mode === "loading") return;
    const loaded = await getSettingsRepo(mode).load();
    const disliked = collectDislikedIds(
      useExercisePreferencesStore.getState().byExerciseId,
    );
    const { defaultWarmUp, defaultCoolDown } = pruneStoredStretchDefaults(
      loaded.defaultWarmUp ?? [],
      loaded.defaultCoolDown ?? [],
      disliked,
    );
    const merged: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      defaultWarmUp,
      defaultCoolDown,
    };

    const pruned =
      !stretchListsEqual(defaultWarmUp, loaded.defaultWarmUp ?? []) ||
      !stretchListsEqual(defaultCoolDown, loaded.defaultCoolDown ?? []);

    set({ ...merged, hydrated: true });

    if (mode === "authenticated" && pruned) {
      try {
        await getSettingsRepo(mode).save(merged);
      } catch (err) {
        console.error("[useSettingsStore.pruneStretchDefaults]", err);
      }
    }
  },
}));

function equipmentListsEqual(
  a: ExerciseEquipment[],
  b: ExerciseEquipment[],
): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join(",");
  const sb = [...b].sort().join(",");
  return sa === sb;
}
