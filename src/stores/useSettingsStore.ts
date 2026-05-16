"use client";

import { create } from "zustand";
import type { UserSettings } from "@/types";
import { DEFAULT_SETTINGS, getSettingsRepo } from "@/lib/repos";
import { refreshCurrentTrainingWeek } from "@/lib/trainingWeekRefresh";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ExerciseEquipment } from "@/types";

interface SettingsState extends UserSettings {
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,

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
    };
    const equipmentChanged =
      partial.availableEquipment != null &&
      !equipmentListsEqual(
        current.availableEquipment,
        partial.availableEquipment,
      );

    // Optimistic UI: update store first.
    set(updated);
    try {
      await getSettingsRepo().save(updated);
    } catch (err) {
      console.error("[useSettingsStore.updateSettings]", err);
      return;
    }

    if (equipmentChanged && useAuthStore.getState().mode === "authenticated") {
      try {
        await refreshCurrentTrainingWeek("equipment");
      } catch (err) {
        console.error("[useSettingsStore.refreshWeek]", err);
      }
    }
  },

  loadSettings: async () => {
    const mode = useAuthStore.getState().mode;
    if (mode === "loading") return; // Wait until AuthInitializer settles.
    const loaded = await getSettingsRepo(mode).load();
    set(loaded);
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
