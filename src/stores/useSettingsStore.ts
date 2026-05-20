"use client";

import { create } from "zustand";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { normalizeUserSettings } from "@/lib/normalizeUserSettings";
import { DEFAULT_SETTINGS, getSettingsRepo } from "@/lib/repos";
import {
  refreshCurrentCustomWeekSchedule,
  refreshCurrentTrainingWeek,
} from "@/lib/trainingWeekRefresh";
import {
  pruneStoredStretchDefaults,
  stretchListsEqual,
} from "@/lib/stretchDefaults";
import { readLegacyLocalEquipmentOnboardingDone } from "@/lib/equipmentOnboarding";
import { settingsHydrationKey } from "@/lib/settingsHydration";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  toastSaveError,
  toastSavePartialWarning,
} from "@/utils/saveErrorToast";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import {
  weeklyCardioSettingsChanged,
  weeklyRestSettingsChanged,
} from "@/lib/weekPlanPreferences";
import { layoutEqual } from "@/lib/weeklyCategoryLayout";
import type { ExerciseEquipment, UserSettings } from "@/types";

interface SettingsState extends UserSettings {
  /** True after a successful `loadSettings` (see `hydratedForAuthKey`). */
  hydrated: boolean;
  /** Auth context the in-memory settings were loaded for (`user:<id>`, `guest`, `anonymous`). */
  hydratedForAuthKey: string | null;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  hydratedForAuthKey: null,

  updateSettings: async (partial) => {
    const current = get();
    const snapshot = pickUserSettingsFields(current);
    const settingsPartial = pickUserSettingsFields({ ...current, ...partial });
    const updated = normalizeUserSettings(settingsPartial);
    const equipmentChanged =
      partial.availableEquipment != null &&
      !equipmentListsEqual(
        current.availableEquipment,
        partial.availableEquipment,
      );
    const programProfileChanged =
      (partial.programMode != null &&
        partial.programMode !== current.programMode) ||
      (partial.trainingPriorityPreset != null &&
        partial.trainingPriorityPreset !== current.trainingPriorityPreset) ||
      (partial.programFocus != null &&
        partial.programFocus !== current.trainingPriorityPreset) ||
      (partial.trainingPriorityScores != null &&
        JSON.stringify(partial.trainingPriorityScores) !==
          JSON.stringify(current.trainingPriorityScores)) ||
      (partial.trainingPriorityCustomized != null &&
        partial.trainingPriorityCustomized !== current.trainingPriorityCustomized) ||
      (partial.weeklyCategoryLayout != null &&
        !layoutEqual(
          partial.weeklyCategoryLayout,
          current.weeklyCategoryLayout,
        )) ||
      (partial.weeklyCategoryLayoutCustomized != null &&
        partial.weeklyCategoryLayoutCustomized !==
          current.weeklyCategoryLayoutCustomized) ||
      (partial.roundDensity != null &&
        partial.roundDensity !== current.roundDensity);
    const stretchDefaultsChanged =
      (partial.defaultWarmUp != null &&
        !stretchListsEqual(current.defaultWarmUp, partial.defaultWarmUp)) ||
      (partial.defaultCoolDown != null &&
        !stretchListsEqual(current.defaultCoolDown, partial.defaultCoolDown));
    const weekScheduleChanged =
      weeklyRestSettingsChanged(partial, current) ||
      weeklyCardioSettingsChanged(partial, current);
    const programModeChanged =
      partial.programMode != null && partial.programMode !== current.programMode;

    set((s) => ({ ...s, ...updated }));
    try {
      await getSettingsRepo().save(updated);
    } catch (err) {
      set((s) => ({ ...s, ...snapshot }));
      toastSaveError("settings", err);
      return;
    }

    if (useAuthStore.getState().mode !== "authenticated") return;

    try {
      if (programModeChanged) {
        await refreshCurrentTrainingWeek("program", "full");
      } else if (
        weekScheduleChanged &&
        updated.programMode === "custom"
      ) {
        await refreshCurrentCustomWeekSchedule();
      } else if (programProfileChanged || weekScheduleChanged) {
        await refreshCurrentTrainingWeek("program");
      } else if (equipmentChanged) {
        await refreshCurrentTrainingWeek("equipment");
      } else if (stretchDefaultsChanged) {
        await refreshCurrentTrainingWeek("program");
      }
    } catch (err) {
      toastSavePartialWarning("Settings", err);
    }
  },

  loadSettings: async () => {
    const auth = useAuthStore.getState();
    const mode = auth.mode;
    if (mode === "loading") return;
    const authKey = settingsHydrationKey(mode, auth.user?.id);
    if (!authKey) return;

    const loaded = await getSettingsRepo(mode).load();
    const disliked = collectDislikedIds(
      useExercisePreferencesStore.getState().byExerciseId,
    );
    const { defaultWarmUp, defaultCoolDown } = pruneStoredStretchDefaults(
      loaded.defaultWarmUp ?? [],
      loaded.defaultCoolDown ?? [],
      disliked,
    );
    let merged: UserSettings = normalizeUserSettings({
      ...loaded,
      defaultWarmUp,
      defaultCoolDown,
    });

    if (
      !merged.equipmentOnboardingCompleted &&
      readLegacyLocalEquipmentOnboardingDone()
    ) {
      merged = { ...merged, equipmentOnboardingCompleted: true };
    }

    const pruned =
      !stretchListsEqual(defaultWarmUp, loaded.defaultWarmUp ?? []) ||
      !stretchListsEqual(defaultCoolDown, loaded.defaultCoolDown ?? []);

    const currentKey = settingsHydrationKey(
      useAuthStore.getState().mode,
      useAuthStore.getState().user?.id,
    );
    if (currentKey !== authKey) return;

    set({ ...merged, hydrated: true, hydratedForAuthKey: authKey });

    const upgradedOnboardingFromLegacy =
      merged.equipmentOnboardingCompleted &&
      loaded.equipmentOnboardingCompleted !== true;

    if (mode === "authenticated" && (pruned || upgradedOnboardingFromLegacy)) {
      try {
        await getSettingsRepo(mode).save(merged);
      } catch (err) {
        console.error("[useSettingsStore.loadSettings.persist]", err);
      }
    }
  },
}));

function pickUserSettingsFields(
  state: SettingsState & Partial<UserSettings>,
): Partial<UserSettings> {
  return {
    restBetweenRounds: state.restBetweenRounds,
    weekStartDate: state.weekStartDate,
    darkMode: state.darkMode,
    restTimerAutoStart: state.restTimerAutoStart,
    timerSoundsEnabled: state.timerSoundsEnabled,
    timerVibrationEnabled: state.timerVibrationEnabled,
    keepScreenAwake: state.keepScreenAwake,
    availableEquipment: state.availableEquipment,
    equipmentOnboardingCompleted: state.equipmentOnboardingCompleted,
    trainingPriorityPreset: state.trainingPriorityPreset,
    trainingPriorityScores: state.trainingPriorityScores,
    trainingPriorityCustomized: state.trainingPriorityCustomized,
    programMode: state.programMode,
    weeklyCategoryLayout: state.weeklyCategoryLayout,
    weeklyCategoryLayoutCustomized: state.weeklyCategoryLayoutCustomized,
    roundDensity: state.roundDensity,
    defaultWarmUp: state.defaultWarmUp,
    defaultCoolDown: state.defaultCoolDown,
    weeklyRestDays: state.weeklyRestDays,
    weeklyRestDaysCustomized: state.weeklyRestDaysCustomized,
    weeklyCardioByDay: state.weeklyCardioByDay,
    weeklyCardioCustomized: state.weeklyCardioCustomized,
  };
}

function equipmentListsEqual(
  a: ExerciseEquipment[],
  b: ExerciseEquipment[],
): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join(",");
  const sb = [...b].sort().join(",");
  return sa === sb;
}
