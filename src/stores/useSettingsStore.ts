"use client";

import { create } from "zustand";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { normalizeUserSettings } from "@/lib/normalizeUserSettings";
import { DEFAULT_SETTINGS, getSettingsRepo } from "@/lib/repos";
import {
  pruneStoredStretchDefaults,
  stretchListsEqual,
} from "@/lib/stretchDefaults";
import { settingsHydrationKey } from "@/lib/settingsHydration";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  toastSaveError,
  toastSavePartialWarning,
} from "@/utils/saveErrorToast";
import {
  mergeReleaseNotesSeenIds,
  releaseNotesSeenIdsEqual,
  scheduleReleaseNotesSeenRemoteSync,
} from "@/lib/releaseNotesSeen";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import {
  weekBlueprintSettingsChanged,
  weeklyCardioSettingsChanged,
  weeklyRestSettingsChanged,
} from "@/lib/weekPlanPreferences";
import { expertiseByGroupEqual } from "@/lib/expertiseLevels";
import type { ExerciseEquipment, UserSettings } from "@/types";

interface SettingsState extends UserSettings {
  /** True after a successful `loadSettings` (see `hydratedForAuthKey`). */
  hydrated: boolean;
  /** Auth context the in-memory settings were loaded for (`user:<id>`, `guest`, `anonymous`). */
  hydratedForAuthKey: string | null;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  loadSettings: (options?: { force?: boolean }) => Promise<void>;
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
    const blueprintChanged = weekBlueprintSettingsChanged(partial, current);
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
      (partial.customBuildStyle != null &&
        partial.customBuildStyle !== current.customBuildStyle) ||
      (partial.roundDensity != null &&
        partial.roundDensity !== current.roundDensity);
    const stretchCountsChanged =
      (partial.warmUpStretchCount != null &&
        partial.warmUpStretchCount !== current.warmUpStretchCount) ||
      (partial.coolDownStretchCount != null &&
        partial.coolDownStretchCount !== current.coolDownStretchCount);
    const weekScheduleChanged =
      weeklyRestSettingsChanged(partial, current) ||
      weeklyCardioSettingsChanged(partial, current);
    const programModeChanged =
      partial.programMode != null && partial.programMode !== current.programMode;
    const expertiseChanged =
      partial.expertiseByGroup != null &&
      !expertiseByGroupEqual(partial.expertiseByGroup, current.expertiseByGroup);

    const authKey = settingsHydrationKey(
      useAuthStore.getState().mode,
      useAuthStore.getState().user?.id,
    );

    set((s) => ({
      ...s,
      ...updated,
      hydrated: true,
      hydratedForAuthKey: s.hydratedForAuthKey ?? authKey,
    }));
    try {
      await getSettingsRepo(useAuthStore.getState().mode).save(updated);
    } catch (err) {
      set((s) => ({ ...s, ...snapshot }));
      toastSaveError("settings", err);
      return;
    }

    if (useAuthStore.getState().mode !== "authenticated") return;

    try {
      const { refreshCurrentCustomWeekSchedule, refreshCurrentTrainingWeek } =
        await import("@/lib/trainingWeekRefresh");
      if (programModeChanged || blueprintChanged) {
        await refreshCurrentTrainingWeek("program", "full");
      } else if (
        weekScheduleChanged &&
        updated.programMode === "custom" &&
        updated.customBuildStyle === "manual"
      ) {
        await refreshCurrentCustomWeekSchedule();
      } else if (
        programProfileChanged ||
        weekScheduleChanged ||
        expertiseChanged
      ) {
        await refreshCurrentTrainingWeek("program");
      } else if (equipmentChanged) {
        await refreshCurrentTrainingWeek("equipment");
      } else if (stretchCountsChanged) {
        await refreshCurrentTrainingWeek("program");
      }
    } catch (err) {
      toastSavePartialWarning("Settings", err);
    }
  },

  loadSettings: async (options?: { force?: boolean }) => {
    const auth = useAuthStore.getState();
    const mode = auth.mode;
    if (mode === "loading") return;
    const authKey = settingsHydrationKey(mode, auth.user?.id);
    if (!authKey) return;

    if (!options?.force && get().hydratedForAuthKey === authKey) return;

    const loaded = await getSettingsRepo(mode).load();
    const remoteSeenIds = loaded.releaseNotesSeenIds ?? [];
    const syncedSeenIds =
      mode === "authenticated" ? mergeReleaseNotesSeenIds(remoteSeenIds) : [];
    if (mode === "authenticated") {
      scheduleReleaseNotesSeenRemoteSync(remoteSeenIds, syncedSeenIds);
    }
    const releaseNotesSeenIds = releaseNotesSeenIdsEqual(
      get().releaseNotesSeenIds,
      syncedSeenIds,
    )
      ? get().releaseNotesSeenIds
      : syncedSeenIds;
    const disliked = collectDislikedIds(
      useExercisePreferencesStore.getState().byExerciseId,
    );
    const { defaultWarmUp, defaultCoolDown } = pruneStoredStretchDefaults(
      loaded.defaultWarmUp ?? [],
      loaded.defaultCoolDown ?? [],
      disliked,
    );
    const merged: UserSettings = normalizeUserSettings({
      ...loaded,
      releaseNotesSeenIds,
      defaultWarmUp,
      defaultCoolDown,
    });

    const pruned =
      !stretchListsEqual(defaultWarmUp, loaded.defaultWarmUp ?? []) ||
      !stretchListsEqual(defaultCoolDown, loaded.defaultCoolDown ?? []);

    const currentKey = settingsHydrationKey(
      useAuthStore.getState().mode,
      useAuthStore.getState().user?.id,
    );
    if (currentKey !== authKey) return;

    if (!options?.force && get().hydratedForAuthKey === authKey) return;

    set({ ...merged, hydrated: true, hydratedForAuthKey: authKey });

    if (mode === "authenticated" && pruned) {
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
    themeMode: state.themeMode,
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
    customBuildStyle: state.customBuildStyle,
    weekBlueprint: state.weekBlueprint,
    weekBlueprintCustomized: state.weekBlueprintCustomized,
    weekBuilderMigrationAcknowledged: state.weekBuilderMigrationAcknowledged,
    weeklyCategoryLayout: state.weeklyCategoryLayout,
    weeklyCategoryLayoutCustomized: state.weeklyCategoryLayoutCustomized,
    weeklyLayoutDayStructure: state.weeklyLayoutDayStructure,
    weeklyLayoutDayStructureCustomized:
      state.weeklyLayoutDayStructureCustomized,
    roundDensity: state.roundDensity,
    warmUpStretchCount: state.warmUpStretchCount,
    coolDownStretchCount: state.coolDownStretchCount,
    defaultWarmUp: state.defaultWarmUp,
    defaultCoolDown: state.defaultCoolDown,
    weeklyRestDays: state.weeklyRestDays,
    weeklyRestDaysCustomized: state.weeklyRestDaysCustomized,
    weeklyPplSchedule: state.weeklyPplSchedule,
    weeklyPplScheduleCustomized: state.weeklyPplScheduleCustomized,
    weeklyCardioByDay: state.weeklyCardioByDay,
    weeklyCardioCustomized: state.weeklyCardioCustomized,
    expertiseByGroup: state.expertiseByGroup,
    releaseNotesSeenIds: state.releaseNotesSeenIds,
    suggestRepIncreases: state.suggestRepIncreases,
    bodySexAtBirth: state.bodySexAtBirth,
    bodyBirthDate: state.bodyBirthDate,
    bodyHeightIn: state.bodyHeightIn,
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
