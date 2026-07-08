"use client";

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  WorkoutLog,
  RoundLog,
  ExerciseLog,
  DayPlan,
  CardioActivityKind,
  ExerciseCategory,
  ExerciseSetMode,
  StretchEntry,
} from "@/types";
import {
  resolveStretchesForWorkoutStart,
  type LoadTrainingWeekForStretches,
} from "@/lib/workoutStretchStart";
import { buildStretchResolveContextFromInputs } from "@/lib/stretchResolveContext";
import { registerPrescribedPlanFreezeStateReader } from "@/lib/planResolverFreezeState";
import type { AuthMode } from "@/core";
import {
  canResumeInProgressForDate,
  getBackfillEligibility,
  localNoonIsoForDateKey,
} from "@/lib/backfillWorkout";
import { parseLocalDateKey } from "@/utils/localDateKey";
import { weekKeyFromDateKey } from "@/utils/weekCalendar";
import { getWorkoutRepo as resolveWorkoutRepo } from "@/lib/repos";
import {
  persistCompletedWorkout,
  prepareCompleteWorkout,
} from "@/use-cases/workout/completeWorkout";
import {
  buildEmptyCardioLogs,
  CARDIO_KIND_TO_EXERCISE_ID,
  resolveCardioActivities,
} from "@/lib/cardioActivities";
import { workoutLogForPersistence } from "@/lib/workoutCardioPersistence";
import type { CardioHealthMeta } from "@/lib/health/cardioHealth";
import { refreshAppTrackedCardioHealthEnrich } from "@/lib/health/refreshCardioHealthEnrich";
import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";
import { clientTrace, clientTraceAsync } from "@/lib/diagnostics/clientTrace";
import { getCardioLog, patchCardioLog } from "@/lib/cardioWorkoutLog";
import { stripMeaninglessCardioFromWorkout } from "@/lib/cardioRowMeaningful";
import {
  buildCardioSessionCapturePatch,
  type CardioSessionCaptureInput,
} from "@/lib/cardioSessionLog";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { settingsHydrationKey } from "@/lib/settingsHydration";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getSwapCandidates,
  pickRandomSwap,
  swapCandidatePrefsFromStores,
} from "@/lib/exerciseSwap";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { exerciseMap } from "@/core/catalog";
import {
  applyClampedTargetDuration,
  mapRoundExercises,
  mapStretchLogs,
  skipExerciseLog,
  stretchSectionComplete,
  toggleExerciseCompletion,
} from "@/lib/activeWorkoutMutations";
import {
  clearExerciseMetrics,
  hydrateWorkoutLog,
} from "@/utils/exerciseLogDefaults";
import { scaledDefaultTimerSeconds } from "@/lib/prescriptionScaling";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  formatPlanTargetPrescription,
  resolveExerciseSettings,
  resolveStretchTimerTargetSeconds,
} from "@/utils/effectiveExerciseSettings";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { toastSaveError } from "@/utils/saveErrorToast";
import { writeCompletedWorkoutToHealth } from "@/lib/health/completedWorkoutHealthWrite";
import {
  cancelScheduledPersistActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  getPausedDraftDate,
  loadActiveWorkoutDraft,
  saveActiveWorkoutDraft,
  schedulePersistActiveWorkoutDraft,
  shouldAutoRestoreDraft,
  type DraftAuthScope,
} from "@/lib/activeWorkoutDraft";
import {
  cancelScheduledPersistInProgressWorkout,
  clearWorkoutCompleting,
  flushPersistInProgressWorkout,
  markWorkoutCompleting,
  schedulePersistInProgressWorkout,
  upsertWorkoutInHistory,
} from "@/lib/inProgressWorkoutSync";
import {
  pauseStaleInProgressLogs,
  isStaleSessionDate,
} from "@/lib/workoutSessionStale";
import { withWorkoutSessionStartLock } from "@/lib/workoutSessionStartLock";
import {
  findCompletedWorkoutForDate,
  findInProgressWorkoutForDate,
  findInProgressWorkoutForDateIncludingActive,
  finalizeCardioOnlyQuickLogWorkout,
  finalizeCardioOnlyQuickLogsInHistory,
  getPausedWorkoutDateForToday,
  isCardioOnlyQuickLogWorkout,
  shouldAutoRestoreInProgressFromHistory,
} from "@/utils/workoutLogLookup";
import {
  appendCardioRow,
  buildCompletedQuickCardioRow,
  cardioRowKey,
} from "@/lib/cardioInstances";
import type { RoundCopyMode } from "@/lib/dayPlanRoundCopy";
import {
  addCardioKind,
  addRoundAt,
  applyRoundCopyFromPriorInWorkout,
  insertEmptyRoundAt,
  insertRoundCopyAt,
  removeRoundAt,
  removeCardioAt,
  removeCoolDownStretchAt,
  removeRoundExerciseAt,
  removeWarmUpStretchAt,
} from "@/lib/workoutLogStructure";

const loadTrainingWeekForStretches: LoadTrainingWeekForStretches = async (
  anchor: string,
  mode: AuthMode,
) => {
  const { resolveTrainingWeekForAuth } = await import("@/lib/planResolver");
  return resolveTrainingWeekForAuth(anchor, mode);
};

function stretchContextForWorkoutStart(weekAnchorDateKey?: string) {
  const anchor =
    (weekAnchorDateKey ? weekKeyFromDateKey(weekAnchorDateKey) : null) ??
    weekKeyFromDateKey(formatLocalDateKey());
  return buildStretchResolveContextFromInputs({
    warmUpStretchCount: useSettingsStore.getState().warmUpStretchCount,
    coolDownStretchCount: useSettingsStore.getState().coolDownStretchCount,
    exercisePreferences: useExercisePreferencesStore.getState().byExerciseId,
    weekRotationKey: anchor ?? undefined,
  });
}

function draftScope(): DraftAuthScope {
  const auth = useAuthStore.getState();
  return { mode: auth.mode, userId: auth.user?.id ?? null };
}

function workoutRepo() {
  return resolveWorkoutRepo(useAuthStore.getState().mode);
}

function seedTimerTargetSecondsFromResolved(
  resolved: ReturnType<typeof resolveExerciseSettings>,
  meta?: {
    isTimeBased: boolean;
    defaultReps: string;
    category: ExerciseCategory;
  },
  stored?: { defaultTimerSeconds?: number | null },
): number | undefined {
  if (resolved.defaultSetMode !== "timer") return undefined;
  const hasLibraryOverride =
    stored?.defaultTimerSeconds != null && stored.defaultTimerSeconds > 0;
  if (hasLibraryOverride) {
    return Math.min(999, Math.max(5, stored.defaultTimerSeconds!));
  }
  if (meta) {
    return scaledDefaultTimerSeconds(
      meta,
      useSettingsStore.getState().expertiseByGroup,
    );
  }
  const sec = resolved.defaultTimerSeconds ?? DEFAULT_TIMER_SECONDS_FALLBACK;
  return Math.min(999, Math.max(5, sec));
}

function syncStretchLogsFromLibrary(logs: ExerciseLog[]): ExerciseLog[] {
  const byId = useExerciseSettingsStore.getState().byExerciseId;
  return logs.map((log) => {
    const meta = exerciseMap[log.exerciseId];
    if (!meta) return log;
    const stored = byId[log.exerciseId];
    const resolved = resolveExerciseSettings(meta, stored);
    if (resolved.defaultSetMode !== "timer") return log;
    const nextSec = resolveStretchTimerTargetSeconds(
      meta,
      stored,
      log.targetDurationSeconds,
      log.targetPrescription,
    );
    if (
      log.loggingMode === "timer" &&
      log.targetDurationSeconds === nextSec &&
      log.targetPrescription === `${nextSec} sec`
    ) {
      return log;
    }
    return {
      ...log,
      loggingMode: "timer",
      targetDurationSeconds: nextSec,
      targetPrescription: `${nextSec} sec`,
    };
  });
}

function swapStretchInList(
  logs: ExerciseLog[],
  fromExerciseId: string,
  toExerciseId: string,
): ExerciseLog[] | null {
  const index = logs.findIndex((e) => e.exerciseId === fromExerciseId);
  if (index < 0) return null;
  if (logs.some((e, i) => i !== index && e.exerciseId === toExerciseId)) {
    return null;
  }
  const meta = exerciseMap[toExerciseId];
  if (!meta || (meta.category !== "SW" && meta.category !== "SC")) {
    return null;
  }
  const previous = logs[index]!;
  const entry: StretchEntry = {
    exerciseId: toExerciseId,
    targetReps: meta.defaultReps,
  };
  const fresh = buildStretchExerciseLog(entry);
  const next = [...logs];
  next[index] = {
    ...fresh,
    completed: previous.completed,
    skipped: previous.skipped,
    actualReps: previous.actualReps,
    actualDuration: previous.actualDuration,
  };
  return next;
}

function buildStretchExerciseLog(entry: StretchEntry): ExerciseLog {
  const meta = exerciseMap[entry.exerciseId];
  const stored = useExerciseSettingsStore.getState().byExerciseId[entry.exerciseId];
  const resolved = resolveExerciseSettings(
    meta ?? {
      id: entry.exerciseId,
      isTimeBased: false,
      category: "SW",
      name: "",
      defaultReps: entry.targetReps,
      notes: "",
    },
    stored,
  );
  const loggingMode = resolved.defaultSetMode;
  const targetDurationSeconds = seedTimerTargetSecondsFromResolved(resolved);
  return {
    exerciseId: entry.exerciseId,
    completed: false,
    skipped: false,
    targetPrescription:
      loggingMode === "timer" && targetDurationSeconds != null
        ? `${targetDurationSeconds} sec`
        : entry.targetReps,
    loggingMode,
    targetDurationSeconds,
  };
}

interface WorkoutState {
  activeWorkout: WorkoutLog | null;
  workoutHistory: WorkoutLog[];
  /** Calendar date (`YYYY-MM-DD`) of a paused draft, if any. */
  pausedWorkoutDate: string | null;
  startWorkout: (plan: DayPlan) => void;
  /** Retroactive log for a past calendar day (`YYYY-MM-DD`). */
  startWorkoutForDate: (plan: DayPlan, dateKey: string) => boolean;
  /** Resume an in-progress log for `dateKey` (stale / backfill sessions). */
  continueInProgressWorkout: (plan: DayPlan, dateKey: string) => boolean;
  toggleJog: () => void;
  skipJog: () => void;
  unskipJog: () => void;
  setJogDistance: (distance: number | undefined) => void;
  setJogDurationSeconds: (seconds: number | undefined) => void;
  toggleCardio: (instanceKey: string) => void;
  skipCardio: (instanceKey: string) => void;
  unskipCardio: (instanceKey: string) => void;
  setCardioDistance: (instanceKey: string, distance: number | undefined) => void;
  setCardioDurationSeconds: (
    instanceKey: string,
    seconds: number | undefined,
  ) => void;
  applyCardioSessionCapture: (
    instanceKey: string,
    input: CardioSessionCaptureInput,
  ) => void;
  toggleWarmUpStretch: (exerciseId: string) => void;
  toggleCoolDownStretch: (exerciseId: string) => void;
  toggleExercise: (roundNumber: number, exerciseId: string) => void;
  setActualReps: (roundNumber: number, exerciseId: string, reps: number | undefined) => void;
  setActualDuration: (
    roundNumber: number,
    exerciseId: string,
    seconds: number | undefined,
  ) => void;
  setTargetDuration: (
    roundNumber: number,
    exerciseId: string,
    seconds: number | undefined,
  ) => void;
  setRoundExerciseLoggingMode: (
    roundNumber: number,
    exerciseId: string,
    mode: ExerciseSetMode,
  ) => void;
  swapRoundExercise: (
    roundNumber: number,
    slotIndex: number,
    substituteId: string,
    category: ExerciseCategory,
  ) => void;
  clearRoundExerciseSwap: (roundNumber: number, slotIndex: number) => void;
  shuffleRoundExercise: (
    roundNumber: number,
    slotIndex: number,
    category: ExerciseCategory,
  ) => void;
  skipExercise: (roundNumber: number, exerciseId: string) => void;
  unskipExercise: (roundNumber: number, exerciseId: string) => void;
  skipWarmUpStretch: (exerciseId: string) => void;
  unskipWarmUpStretch: (exerciseId: string) => void;
  skipCoolDownStretch: (exerciseId: string) => void;
  unskipCoolDownStretch: (exerciseId: string) => void;
  swapWarmUpStretch: (fromExerciseId: string, toExerciseId: string) => void;
  swapCoolDownStretch: (fromExerciseId: string, toExerciseId: string) => void;
  setWarmUpStretchTargetDuration: (
    exerciseId: string,
    seconds: number | undefined,
  ) => void;
  setCoolDownStretchTargetDuration: (
    exerciseId: string,
    seconds: number | undefined,
  ) => void;
  setWarmUpStretchActualDuration: (
    exerciseId: string,
    seconds: number | undefined,
  ) => void;
  setCoolDownStretchActualDuration: (
    exerciseId: string,
    seconds: number | undefined,
  ) => void;
  setWarmUpStretchActualReps: (
    exerciseId: string,
    reps: number | undefined,
  ) => void;
  setCoolDownStretchActualReps: (
    exerciseId: string,
    reps: number | undefined,
  ) => void;
  setWorkoutNotes: (notes: string) => void;
  completeWorkout: () => Promise<WorkoutLog | null>;
  discardWorkout: () => void;
  /** Persist progress and leave Today until Resume. */
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  /** Update notes on a finished workout (same id upsert via repo). */
  updateCompletedWorkoutNotes: (
    workoutId: string,
    notes: string,
  ) => Promise<void>;
  /** Open a completed log in the live session UI (preserves `endTime`). */
  startEditingCompletedWorkout: (workoutId: string) => boolean;
  saveEditedWorkout: () => Promise<WorkoutLog | null>;
  cancelEditingWorkout: () => void;
  addRoundToWorkout: () => void;
  insertEmptyRoundAtWorkout: (insertAt: number) => void;
  insertRoundCopyAtWorkout: (
    insertAt: number,
    sourceRoundNumber: number,
    mode: RoundCopyMode,
  ) => void;
  applyRoundCopyFromPriorWorkout: (
    roundNumber: number,
    mode: RoundCopyMode,
  ) => void;
  removeRoundFromWorkout: (roundNumber: number) => void;
  removeRoundExercise: (roundNumber: number, slotIndex: number) => void;
  addRoundExercise: (roundNumber: number, exerciseId: string) => void;
  removeWarmUpStretchFromWorkout: (exerciseId: string) => void;
  addWarmUpStretchToWorkout: (exerciseId: string) => void;
  removeCoolDownStretchFromWorkout: (exerciseId: string) => void;
  addCoolDownStretchToWorkout: (exerciseId: string) => void;
  removeCardioFromWorkout: (instanceKey: string) => void;
  addCardioToWorkout: (kind: CardioActivityKind) => void;
  quickLogCardio: (
    dateKey: string,
    kind: CardioActivityKind,
    input: {
      distanceMi?: number;
      durationSeconds?: number;
      health?: CardioHealthMeta;
      gpsTrackPoints?: readonly GpsTrackPoint[];
      activityStartTime?: string;
      activityEndTime?: string;
    },
  ) => Promise<boolean>;

  /** Auth session key when `workoutHistory` was last loaded from repos. */
  historyLoadedForAuthKey: string | null;
  loadHistory: (options?: { force?: boolean }) => Promise<void>;
  /** Drop session cache so the next `loadHistory` refetches (e.g. auth change). */
  invalidateHistory: (options?: { clearData?: boolean }) => void;
  /** Pause prior-day in-progress rows and clear a stale live session (midnight rules). */
  reconcileDayBoundary: () => Promise<void>;
  /** Delete an unfinished workout from a previous calendar day. */
  discardStaleWorkout: (workoutId: string) => void;
  /** Re-apply Library timer defaults to warm-up / cool-down on an active workout. */
  syncStretchTargetsFromLibrary: () => void;
}

function buildEmptyRoundLogs(plan: DayPlan): RoundLog[] {
  const byId = useExerciseSettingsStore.getState().byExerciseId;
  const expertiseByGroup = useSettingsStore.getState().expertiseByGroup;
  return plan.rounds.map((round) => ({
    roundNumber: round.roundNumber,
    exercises: round.exercises.map((ex): ExerciseLog => {
      const meta = exerciseMap[ex.exerciseId];
      const stored = byId[ex.exerciseId];
      const resolved = resolveExerciseSettings(
        meta ?? {
          id: ex.exerciseId,
          isTimeBased: false,
          category: ex.category,
          name: "",
          defaultReps: "",
          notes: "",
        },
        stored,
      );
      const prescriptionOpts = { expertiseByGroup };
      const targetPrescription =
        ex.targetReps?.trim() ||
        formatPlanTargetPrescription(
          meta ?? {
            id: ex.exerciseId,
            isTimeBased: false,
            category: ex.category,
            defaultReps: ex.targetReps,
          },
          stored,
          prescriptionOpts,
        );
      return {
        exerciseId: ex.exerciseId,
        completed: false,
        skipped: false,
        targetPrescription,
        loggingMode: resolved.defaultSetMode,
        targetDurationSeconds: seedTimerTargetSecondsFromResolved(
          resolved,
          meta
            ? {
                isTimeBased: meta.isTimeBased,
                defaultReps: meta.defaultReps,
                category: meta.category,
              }
            : {
                isTimeBased: false,
                defaultReps: ex.targetReps,
                category: ex.category,
              },
          stored,
        ),
      };
    }),
  }));
}

let historyLoadInFlight: Promise<void> | null = null;

export const useWorkoutStore = create<WorkoutState>((set, get) => {
  const beginWorkoutSession = async (
    plan: DayPlan,
    dateKey: string,
    startTimeIso: string,
    dayOfWeek: number,
    weekAnchorDateKey?: string,
  ) => {
    await withWorkoutSessionStartLock(dateKey, async () => {
      const authMode = useAuthStore.getState().mode;
      const { warmUp, coolDown } = await resolveStretchesForWorkoutStart(
        plan,
        stretchContextForWorkoutStart(weekAnchorDateKey),
        {
          weekAnchorDateKey,
          authMode,
          loadWeek: loadTrainingWeekForStretches,
        },
      );

      const state = get();
      const preservePausedDate =
        state.pausedWorkoutDate && state.pausedWorkoutDate !== dateKey
          ? state.pausedWorkoutDate
          : null;

      const completedCardioOnly = findCompletedWorkoutForDate(
        state.workoutHistory,
        dateKey,
      );
      if (
        completedCardioOnly &&
        isCardioOnlyQuickLogWorkout(completedCardioOnly)
      ) {
        const log = hydrateWorkoutLog({
          ...completedCardioOnly,
          endTime: undefined,
          paused: false,
          startTime: startTimeIso,
          warmUpExercises: warmUp.map(buildStretchExerciseLog),
          coolDownExercises: coolDown.map(buildStretchExerciseLog),
          rounds: buildEmptyRoundLogs(plan),
          warmUpCompleted: false,
          coolDownCompleted: false,
        });
        const mode = useAuthStore.getState().mode;
        set({
          pausedWorkoutDate: preservePausedDate,
          activeWorkout: log,
          ...(mode === "authenticated"
            ? { workoutHistory: upsertWorkoutInHistory(state.workoutHistory, log) }
            : {}),
        });
        if (mode === "authenticated") {
          void flushPersistInProgressWorkout(log, { paused: false });
        }
        return;
      }

      const existing = findInProgressWorkoutForDateIncludingActive(
        state.workoutHistory,
        dateKey,
        state.activeWorkout,
      );
      if (existing) {
        let log = hydrateWorkoutLog({ ...existing, paused: false });
        if (log.warmUpExercises.length === 0 && warmUp.length > 0) {
          log = hydrateWorkoutLog({
            ...log,
            warmUpExercises: warmUp.map(buildStretchExerciseLog),
          });
        }
        if (log.coolDownExercises.length === 0 && coolDown.length > 0) {
          log = hydrateWorkoutLog({
            ...log,
            coolDownExercises: coolDown.map(buildStretchExerciseLog),
          });
        }
        const mode = useAuthStore.getState().mode;
        set({
          pausedWorkoutDate: preservePausedDate,
          activeWorkout: log,
          ...(mode === "authenticated"
            ? { workoutHistory: upsertWorkoutInHistory(state.workoutHistory, log) }
            : {}),
        });
        if (mode === "authenticated") {
          void flushPersistInProgressWorkout(log, { paused: false });
        }
        return;
      }
      const warmUpExercises: ExerciseLog[] = warmUp.map(buildStretchExerciseLog);
      const coolDownExercises: ExerciseLog[] = coolDown.map(
        buildStretchExerciseLog,
      );
      const cardioExercises = buildEmptyCardioLogs(resolveCardioActivities(plan));
      const log: WorkoutLog = {
        id: uuidv4(),
        date: dateKey,
        dayOfWeek,
        cardioExercises,
        warmUpCompleted: false,
        warmUpExercises,
        coolDownCompleted: false,
        coolDownExercises,
        rounds: buildEmptyRoundLogs(plan),
        startTime: startTimeIso,
        paused: false,
      };
      const mode = useAuthStore.getState().mode;
      set({
        pausedWorkoutDate: preservePausedDate,
        activeWorkout: log,
        ...(mode === "authenticated"
          ? { workoutHistory: upsertWorkoutInHistory(state.workoutHistory, log) }
          : {}),
      });
      if (mode === "authenticated") {
        void flushPersistInProgressWorkout(log, { paused: false });
      }
    });
  };

  return {
  activeWorkout: null,
  workoutHistory: [],
  pausedWorkoutDate: null,
  historyLoadedForAuthKey: null,
  startWorkout: (plan) => {
    const now = new Date();
    const dateKey = formatLocalDateKey(now);
    void beginWorkoutSession(
      plan,
      dateKey,
      now.toISOString(),
      now.getDay(),
      weekKeyFromDateKey(dateKey) ?? undefined,
    );
  },

  startWorkoutForDate: (plan, dateKey) => {
    const state = get();
    const eligibility = getBackfillEligibility({
      dateKey,
      workoutHistory: state.workoutHistory,
      activeWorkout: state.activeWorkout,
    });
    if (!eligibility.ok) return false;

    const parsed = parseLocalDateKey(dateKey);
    const startIso = localNoonIsoForDateKey(dateKey);
    if (!parsed || !startIso) return false;

    const weekAnchor = weekKeyFromDateKey(dateKey);
    void beginWorkoutSession(
      plan,
      dateKey,
      startIso,
      parsed.getDay(),
      weekAnchor ?? undefined,
    );
    return true;
  },

  continueInProgressWorkout: (plan, dateKey) => {
    const state = get();
    const eligibility = canResumeInProgressForDate({
      dateKey,
      workoutHistory: state.workoutHistory,
      activeWorkout: state.activeWorkout,
    });
    if (!eligibility.ok) return false;

    const inProgress = findInProgressWorkoutForDate(state.workoutHistory, dateKey);
    const parsed = parseLocalDateKey(dateKey);
    const startIso =
      inProgress?.startTime ?? localNoonIsoForDateKey(dateKey);
    if (!inProgress || !parsed || !startIso) return false;

    const weekAnchor = weekKeyFromDateKey(dateKey);
    void beginWorkoutSession(
      plan,
      dateKey,
      startIso,
      parsed.getDay(),
      weekAnchor ?? undefined,
    );
    return true;
  },

  toggleJog: () => {
    const state = get();
    if (!state.activeWorkout) return;
    const jogKey = (state.activeWorkout.cardioExercises ?? []).find(
      (r) => r.exerciseId === CARDIO_KIND_TO_EXERCISE_ID.jog,
    );
    if (jogKey) get().toggleCardio(cardioRowKey(jogKey));
  },

  skipJog: () => {
    const state = get();
    const row = state.activeWorkout?.cardioExercises?.find(
      (r) => r.exerciseId === CARDIO_KIND_TO_EXERCISE_ID.jog,
    );
    if (row) get().skipCardio(cardioRowKey(row));
  },

  unskipJog: () => {
    const state = get();
    const row = state.activeWorkout?.cardioExercises?.find(
      (r) => r.exerciseId === CARDIO_KIND_TO_EXERCISE_ID.jog,
    );
    if (row) get().unskipCardio(cardioRowKey(row));
  },

  setJogDistance: (distance) => {
    const state = get();
    const row = state.activeWorkout?.cardioExercises?.find(
      (r) => r.exerciseId === CARDIO_KIND_TO_EXERCISE_ID.jog,
    );
    if (row) get().setCardioDistance(cardioRowKey(row), distance);
  },

  setJogDurationSeconds: (seconds) => {
    const state = get();
    const row = state.activeWorkout?.cardioExercises?.find(
      (r) => r.exerciseId === CARDIO_KIND_TO_EXERCISE_ID.jog,
    );
    if (row) get().setCardioDurationSeconds(cardioRowKey(row), seconds);
  },

  toggleCardio: (instanceKey) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const current = getCardioLog(state.activeWorkout, instanceKey);
      return {
        activeWorkout: patchCardioLog(state.activeWorkout, instanceKey, {
          completed: !(current?.completed ?? false),
          skipped: false,
        }),
      };
    }),

  skipCardio: (instanceKey) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: patchCardioLog(state.activeWorkout, instanceKey, {
          skipped: true,
          completed: false,
        }),
      };
    }),

  unskipCardio: (instanceKey) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: patchCardioLog(state.activeWorkout, instanceKey, {
          skipped: false,
        }),
      };
    }),

  setCardioDistance: (instanceKey, distance) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: patchCardioLog(state.activeWorkout, instanceKey, {
          actualDistanceMi: distance,
        }),
      };
    }),

  setCardioDurationSeconds: (instanceKey, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: patchCardioLog(state.activeWorkout, instanceKey, {
          actualDuration: seconds,
        }),
      };
    }),

  applyCardioSessionCapture: (instanceKey, input) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: hydrateWorkoutLog(
          patchCardioLog(
            state.activeWorkout,
            instanceKey,
            buildCardioSessionCapturePatch(input),
          ),
        ),
      };
    }),

  toggleWarmUpStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = mapStretchLogs(
        state.activeWorkout.warmUpExercises,
        exerciseId,
        toggleExerciseCompletion,
      );
      return {
        activeWorkout: {
          ...state.activeWorkout,
          warmUpExercises,
          warmUpCompleted: stretchSectionComplete(warmUpExercises),
        },
      };
    }),

  toggleCoolDownStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = mapStretchLogs(
        state.activeWorkout.coolDownExercises,
        exerciseId,
        toggleExerciseCompletion,
      );
      return {
        activeWorkout: {
          ...state.activeWorkout,
          coolDownExercises,
          coolDownCompleted: stretchSectionComplete(coolDownExercises),
        },
      };
    }),

  toggleExercise: (roundNumber, exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = mapRoundExercises(
        state.activeWorkout.rounds,
        roundNumber,
        exerciseId,
        toggleExerciseCompletion,
      );
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  setActualReps: (roundNumber, exerciseId, reps) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = mapRoundExercises(
        state.activeWorkout.rounds,
        roundNumber,
        exerciseId,
        (ex) => ({ ...ex, actualReps: reps ?? undefined }),
      );
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  setActualDuration: (roundNumber, exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = mapRoundExercises(
        state.activeWorkout.rounds,
        roundNumber,
        exerciseId,
        (ex) => ({ ...ex, actualDuration: seconds ?? undefined }),
      );
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  setTargetDuration: (roundNumber, exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = mapRoundExercises(
        state.activeWorkout.rounds,
        roundNumber,
        exerciseId,
        (ex) => applyClampedTargetDuration(ex, seconds),
      );
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  setRoundExerciseLoggingMode: (roundNumber, exerciseId, mode) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = state.activeWorkout.rounds.map((r) => {
        if (r.roundNumber !== roundNumber) return r;
        return {
          ...r,
          exercises: r.exercises.map((ex) => {
            if (ex.exerciseId !== exerciseId) return ex;
            if (mode === "reps") {
              return {
                ...ex,
                loggingMode: "reps" as const,
                actualDuration: undefined,
                targetDurationSeconds: undefined,
              };
            }
            const id = ex.exerciseId;
            const meta = exerciseMap[id];
            const byId = useExerciseSettingsStore.getState().byExerciseId;
            const resolved = resolveExerciseSettings(
              meta ?? {
                id,
                isTimeBased: false,
                category: "UP",
                name: "",
                defaultReps: "",
                notes: "",
              },
              byId[id],
            );
            return {
              ...ex,
              loggingMode: "timer" as const,
              actualReps: undefined,
              actualDuration: undefined,
              targetDurationSeconds: seedTimerTargetSecondsFromResolved(
                resolved,
                meta
                  ? {
                      isTimeBased: meta.isTimeBased,
                      defaultReps: meta.defaultReps,
                      category: meta.category,
                    }
                  : undefined,
                byId[id],
              ),
            };
          }),
        };
      });
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  swapRoundExercise: (roundNumber, slotIndex, substituteId, category) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = state.activeWorkout.rounds.map((r) => {
        if (r.roundNumber !== roundNumber) return r;
        if (slotIndex < 0 || slotIndex >= r.exercises.length) return r;
        const logs = r.exercises;
        const log = logs[slotIndex];
        const candidates = getSwapCandidates(
          category,
          log.exerciseId,
          logs,
          slotIndex,
          swapCandidatePrefsFromStores(
            () => useSettingsStore.getState().availableEquipment,
            () => useExercisePreferencesStore.getState().byExerciseId,
            () => useSettingsStore.getState(),
          ),
        );
        if (!candidates.some((c) => c.id === substituteId)) return r;
        return {
          ...r,
          exercises: logs.map((ex, j) =>
            j === slotIndex
              ? (() => {
                  const meta = exerciseMap[substituteId];
                  const byId = useExerciseSettingsStore.getState().byExerciseId;
                  const expertiseByGroup = useSettingsStore.getState().expertiseByGroup;
                  const resolved = resolveExerciseSettings(
                    meta ?? {
                      id: substituteId,
                      isTimeBased: false,
                      category,
                      name: "",
                      defaultReps: "",
                      notes: "",
                    },
                    byId[substituteId],
                  );
                  const targetPrescription = meta
                    ? formatPlanTargetPrescription(meta, byId[substituteId], {
                        expertiseByGroup,
                      })
                    : (exerciseMap[substituteId]?.defaultReps ?? ex.targetPrescription);
                  return {
                    ...ex,
                    swappedWith: substituteId,
                    skipped: false,
                    actualReps: undefined,
                    actualDuration: undefined,
                    loggingMode: resolved.defaultSetMode,
                    targetDurationSeconds: seedTimerTargetSecondsFromResolved(
                      resolved,
                      meta
                        ? {
                            isTimeBased: meta.isTimeBased,
                            defaultReps: meta.defaultReps,
                            category: meta.category,
                          }
                        : {
                            isTimeBased: false,
                            defaultReps: targetPrescription,
                            category,
                          },
                      byId[substituteId],
                    ),
                    targetPrescription,
                  };
                })()
              : ex,
          ),
        };
      });
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  clearRoundExerciseSwap: (roundNumber, slotIndex) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = state.activeWorkout.rounds.map((r) => {
        if (r.roundNumber !== roundNumber) return r;
        if (slotIndex < 0 || slotIndex >= r.exercises.length) return r;
        const logs = r.exercises;
        return {
          ...r,
          exercises: logs.map((ex, j) =>
            j === slotIndex
              ? (() => {
                  const meta = exerciseMap[ex.exerciseId];
                  const byId = useExerciseSettingsStore.getState().byExerciseId;
                  const expertiseByGroup = useSettingsStore.getState().expertiseByGroup;
                  const resolved = resolveExerciseSettings(
                    meta ?? {
                      id: ex.exerciseId,
                      isTimeBased: false,
                      category: exerciseMap[ex.exerciseId]?.category ?? "UP",
                      name: "",
                      defaultReps: "",
                      notes: "",
                    },
                    byId[ex.exerciseId],
                  );
                  const targetPrescription = meta
                    ? formatPlanTargetPrescription(meta, byId[ex.exerciseId], {
                        expertiseByGroup,
                      })
                    : (exerciseMap[ex.exerciseId]?.defaultReps ?? ex.targetPrescription);
                  return {
                    ...ex,
                    swappedWith: undefined,
                    actualReps: undefined,
                    actualDuration: undefined,
                    loggingMode: resolved.defaultSetMode,
                    targetDurationSeconds: seedTimerTargetSecondsFromResolved(
                      resolved,
                      meta
                        ? {
                            isTimeBased: meta.isTimeBased,
                            defaultReps: meta.defaultReps,
                            category: meta.category,
                          }
                        : undefined,
                      byId[ex.exerciseId],
                    ),
                    targetPrescription,
                  };
                })()
              : ex,
          ),
        };
      });
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  shuffleRoundExercise: (roundNumber, slotIndex, category) => {
    const state = get();
    if (!state.activeWorkout) return;
    const r = state.activeWorkout.rounds.find(
      (x) => x.roundNumber === roundNumber,
    );
    if (!r || slotIndex < 0 || slotIndex >= r.exercises.length) return;
    const logs = r.exercises;
    const log = logs[slotIndex];
    const candidates = getSwapCandidates(
      category,
      log.exerciseId,
      logs,
      slotIndex,
      swapCandidatePrefsFromStores(
        () => useSettingsStore.getState().availableEquipment,
        () => useExercisePreferencesStore.getState().byExerciseId,
        () => useSettingsStore.getState(),
      ),
    );
    const pick = pickRandomSwap(candidates);
    if (!pick) return;
    get().swapRoundExercise(roundNumber, slotIndex, pick.id, category);
  },

  addRoundToWorkout: () =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: hydrateWorkoutLog(addRoundAt(state.activeWorkout)),
      };
    }),

  insertEmptyRoundAtWorkout: (insertAt) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: hydrateWorkoutLog(
          insertEmptyRoundAt(state.activeWorkout, insertAt),
        ),
      };
    }),

  insertRoundCopyAtWorkout: (insertAt, sourceRoundNumber, mode) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const prefs = swapCandidatePrefsFromStores(
        () => useSettingsStore.getState().availableEquipment,
        () => useExercisePreferencesStore.getState().byExerciseId,
        () => useSettingsStore.getState(),
      );
      return {
        activeWorkout: hydrateWorkoutLog(
          insertRoundCopyAt(
            state.activeWorkout,
            insertAt,
            sourceRoundNumber,
            mode,
            prefs,
          ),
        ),
      };
    }),

  applyRoundCopyFromPriorWorkout: (roundNumber, mode) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const prefs = swapCandidatePrefsFromStores(
        () => useSettingsStore.getState().availableEquipment,
        () => useExercisePreferencesStore.getState().byExerciseId,
        () => useSettingsStore.getState(),
      );
      return {
        activeWorkout: hydrateWorkoutLog(
          applyRoundCopyFromPriorInWorkout(
            state.activeWorkout,
            roundNumber,
            mode,
            prefs,
          ),
        ),
      };
    }),

  removeRoundFromWorkout: (roundNumber) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: hydrateWorkoutLog(
          removeRoundAt(state.activeWorkout, roundNumber),
        ),
      };
    }),

  removeRoundExercise: (roundNumber, slotIndex) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: hydrateWorkoutLog(
          removeRoundExerciseAt(state.activeWorkout, roundNumber, slotIndex),
        ),
      };
    }),

  addRoundExercise: (roundNumber, exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const byId = useExerciseSettingsStore.getState().byExerciseId;
      const meta = exerciseMap[exerciseId];
      if (!meta) return state;
      const expertiseByGroup = useSettingsStore.getState().expertiseByGroup;
      const resolved = resolveExerciseSettings(meta, byId[exerciseId]);
      const targetPrescription = formatPlanTargetPrescription(meta, byId[exerciseId], {
        expertiseByGroup,
      });
      const loggingMode = resolved.defaultSetMode;
      const targetDurationSeconds = seedTimerTargetSecondsFromResolved(
        resolved,
        {
          isTimeBased: meta.isTimeBased,
          defaultReps: meta.defaultReps,
          category: meta.category,
        },
        byId[exerciseId],
      );
      const rounds = state.activeWorkout.rounds.map((r) => {
        if (r.roundNumber !== roundNumber) return r;
        if (r.exercises.some((e) => e.exerciseId === exerciseId && !e.swappedWith)) {
          return r;
        }
        return {
          ...r,
          exercises: [
            ...r.exercises,
            {
              exerciseId,
              completed: false,
              skipped: false,
              targetPrescription,
              loggingMode,
              targetDurationSeconds,
            },
          ],
        };
      });
      return {
        activeWorkout: hydrateWorkoutLog({
          ...state.activeWorkout,
          rounds,
        }),
      };
    }),

  removeWarmUpStretchFromWorkout: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: hydrateWorkoutLog(
          removeWarmUpStretchAt(state.activeWorkout, exerciseId),
        ),
      };
    }),

  addWarmUpStretchToWorkout: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const entry: StretchEntry = {
        exerciseId,
        targetReps: exerciseMap[exerciseId]?.defaultReps ?? "",
      };
      const log = buildStretchExerciseLog(entry);
      if (state.activeWorkout.warmUpExercises.some((e) => e.exerciseId === exerciseId)) {
        return state;
      }
      const warmUpExercises = [...state.activeWorkout.warmUpExercises, log];
      return {
        activeWorkout: hydrateWorkoutLog({
          ...state.activeWorkout,
          warmUpExercises,
          warmUpCompleted: warmUpExercises.every(
            (e) => e.completed || e.skipped,
          ),
        }),
      };
    }),

  removeCoolDownStretchFromWorkout: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: hydrateWorkoutLog(
          removeCoolDownStretchAt(state.activeWorkout, exerciseId),
        ),
      };
    }),

  addCoolDownStretchToWorkout: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const entry: StretchEntry = {
        exerciseId,
        targetReps: exerciseMap[exerciseId]?.defaultReps ?? "",
      };
      const log = buildStretchExerciseLog(entry);
      if (state.activeWorkout.coolDownExercises.some((e) => e.exerciseId === exerciseId)) {
        return state;
      }
      const coolDownExercises = [...state.activeWorkout.coolDownExercises, log];
      return {
        activeWorkout: hydrateWorkoutLog({
          ...state.activeWorkout,
          coolDownExercises,
          coolDownCompleted: coolDownExercises.every(
            (e) => e.completed || e.skipped,
          ),
        }),
      };
    }),

  removeCardioFromWorkout: (instanceKey) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: hydrateWorkoutLog(
          removeCardioAt(state.activeWorkout, instanceKey),
        ),
      };
    }),

  addCardioToWorkout: (kind) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: hydrateWorkoutLog(addCardioKind(state.activeWorkout, kind)),
      };
    }),

  quickLogCardio: async (dateKey, kind, input) => {
    const hasDistance =
      input.distanceMi != null && input.distanceMi > 0 && !Number.isNaN(input.distanceMi);
    const hasDuration =
      input.durationSeconds != null &&
      input.durationSeconds > 0 &&
      !Number.isNaN(input.durationSeconds);
    clientTrace("quickLogCardio", "start", {
      dateKey,
      kind,
      hasDistance,
      hasDuration,
      authMode: useAuthStore.getState().mode,
    });
    if (!hasDistance && !hasDuration) {
      clientTrace("quickLogCardio", "abort_invalid_input");
      return false;
    }

    const row = buildCompletedQuickCardioRow(kind, {
      distanceMi: hasDistance ? input.distanceMi : undefined,
      durationSeconds: hasDuration ? input.durationSeconds : undefined,
      health: input.health,
      gpsTrackPoints: input.gpsTrackPoints,
      activityStartTime: input.activityStartTime,
      activityEndTime: input.activityEndTime,
    });

    const persistCompletedWorkout = async (log: WorkoutLog): Promise<boolean> => {
      const saved = hydrateWorkoutLog(
        workoutLogForPersistence({ ...log, paused: false }),
      );
      const historyBefore = get().workoutHistory;
      set({
        workoutHistory: upsertWorkoutInHistory(historyBefore, saved),
      });
      try {
        await clientTraceAsync(
          "quickLogCardio",
          "persistCompleted",
          () => workoutRepo().saveWorkout(saved),
          { workoutId: saved.id, date: saved.date },
        );
        return true;
      } catch (err) {
        clientTrace(
          "quickLogCardio",
          "persistCompleted_error",
          { message: err instanceof Error ? err.message : String(err) },
          "error",
        );
        toastSaveError("activity log", err);
        set({ workoutHistory: historyBefore });
        return false;
      }
    };

    const commitInProgressQuickCardio = (log: WorkoutLog): void => {
      const saved = hydrateWorkoutLog(
        workoutLogForPersistence({ ...log, paused: false, endTime: undefined }),
      );
      const mode = useAuthStore.getState().mode;
      const historyBefore = get().workoutHistory;
      set({
        activeWorkout: saved,
        pausedWorkoutDate: null,
        ...(mode === "authenticated"
          ? { workoutHistory: upsertWorkoutInHistory(historyBefore, saved) }
          : {}),
      });
      if (mode === "authenticated") {
        void flushPersistInProgressWorkout(saved, { paused: false });
      } else {
        saveActiveWorkoutDraft(draftScope(), saved, { paused: false });
      }
    };

    const state = get();
    const active = state.activeWorkout;

    if (active && !active.endTime && active.date === dateKey) {
      if (isCardioOnlyQuickLogWorkout(active)) {
        clientTrace("quickLogCardio", "branch_active_cardio_only_finalize");
        set({ activeWorkout: null });
        return persistCompletedWorkout(
          appendCardioRow(
            stripMeaninglessCardioFromWorkout(
              finalizeCardioOnlyQuickLogWorkout(active),
            ),
            row,
          ),
        );
      }
      clientTrace("quickLogCardio", "branch_active_today");
      commitInProgressQuickCardio(
        appendCardioRow(stripMeaninglessCardioFromWorkout(active), row),
      );
      return true;
    }

    if (active && !active.endTime && active.date !== dateKey) {
      clientTrace("quickLogCardio", "branch_blocked_other_day");
      return false;
    }

    const completed = findCompletedWorkoutForDate(state.workoutHistory, dateKey);
    if (completed) {
      clientTrace("quickLogCardio", "branch_completed_day");
      return persistCompletedWorkout(
        appendCardioRow(stripMeaninglessCardioFromWorkout(completed), row),
      );
    }

    const inProgress = findInProgressWorkoutForDate(state.workoutHistory, dateKey);
    if (inProgress) {
      if (isCardioOnlyQuickLogWorkout(inProgress)) {
        clientTrace("quickLogCardio", "branch_in_progress_cardio_only_finalize");
        return persistCompletedWorkout(
          appendCardioRow(
            stripMeaninglessCardioFromWorkout(
              finalizeCardioOnlyQuickLogWorkout(inProgress),
            ),
            row,
          ),
        );
      }
      clientTrace("quickLogCardio", "branch_in_progress_history");
      commitInProgressQuickCardio(
        appendCardioRow(stripMeaninglessCardioFromWorkout(inProgress), row),
      );
      return true;
    }

    clientTrace("quickLogCardio", "branch_cardio_only_completed");
    const dayOfWeek = parseLocalDateKey(dateKey)?.getDay() ?? 0;
    const nowIso = new Date().toISOString();
    const startIso = input.activityStartTime ?? nowIso;
    const endIso = input.activityEndTime ?? nowIso;
    const fresh: WorkoutLog = {
      id: uuidv4(),
      date: dateKey,
      dayOfWeek,
      cardioExercises: [row],
      warmUpCompleted: false,
      warmUpExercises: [],
      coolDownCompleted: false,
      coolDownExercises: [],
      rounds: [],
      startTime: startIso,
      endTime: endIso,
      paused: false,
    };
    return persistCompletedWorkout(fresh);
  },

  skipExercise: (roundNumber, exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = mapRoundExercises(
        state.activeWorkout.rounds,
        roundNumber,
        exerciseId,
        skipExerciseLog,
      );
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  unskipExercise: (roundNumber, exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = mapRoundExercises(
        state.activeWorkout.rounds,
        roundNumber,
        exerciseId,
        (ex) => ({ ...ex, skipped: false }),
      );
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  skipWarmUpStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = mapStretchLogs(
        state.activeWorkout.warmUpExercises,
        exerciseId,
        skipExerciseLog,
      );
      return {
        activeWorkout: {
          ...state.activeWorkout,
          warmUpExercises,
          warmUpCompleted: stretchSectionComplete(warmUpExercises),
        },
      };
    }),

  unskipWarmUpStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = mapStretchLogs(
        state.activeWorkout.warmUpExercises,
        exerciseId,
        (ex) => ({ ...ex, skipped: false }),
      );
      return {
        activeWorkout: {
          ...state.activeWorkout,
          warmUpExercises,
          warmUpCompleted: stretchSectionComplete(warmUpExercises),
        },
      };
    }),

  skipCoolDownStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = mapStretchLogs(
        state.activeWorkout.coolDownExercises,
        exerciseId,
        skipExerciseLog,
      );
      return {
        activeWorkout: {
          ...state.activeWorkout,
          coolDownExercises,
          coolDownCompleted: stretchSectionComplete(coolDownExercises),
        },
      };
    }),

  unskipCoolDownStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = mapStretchLogs(
        state.activeWorkout.coolDownExercises,
        exerciseId,
        (ex) => ({ ...ex, skipped: false }),
      );
      return {
        activeWorkout: {
          ...state.activeWorkout,
          coolDownExercises,
          coolDownCompleted: stretchSectionComplete(coolDownExercises),
        },
      };
    }),

  swapWarmUpStretch: (fromExerciseId, toExerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = swapStretchInList(
        state.activeWorkout.warmUpExercises,
        fromExerciseId,
        toExerciseId,
      );
      if (!warmUpExercises) return state;
      return {
        activeWorkout: hydrateWorkoutLog({
          ...state.activeWorkout,
          warmUpExercises,
          warmUpCompleted: warmUpExercises.every(
            (e) => e.completed || e.skipped,
          ),
        }),
      };
    }),

  swapCoolDownStretch: (fromExerciseId, toExerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = swapStretchInList(
        state.activeWorkout.coolDownExercises,
        fromExerciseId,
        toExerciseId,
      );
      if (!coolDownExercises) return state;
      return {
        activeWorkout: hydrateWorkoutLog({
          ...state.activeWorkout,
          coolDownExercises,
          coolDownCompleted: coolDownExercises.every(
            (e) => e.completed || e.skipped,
          ),
        }),
      };
    }),

  setWarmUpStretchTargetDuration: (exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = mapStretchLogs(
        state.activeWorkout.warmUpExercises,
        exerciseId,
        (ex) => applyClampedTargetDuration(ex, seconds),
      );
      return { activeWorkout: { ...state.activeWorkout, warmUpExercises } };
    }),

  setCoolDownStretchTargetDuration: (exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = mapStretchLogs(
        state.activeWorkout.coolDownExercises,
        exerciseId,
        (ex) => applyClampedTargetDuration(ex, seconds),
      );
      return { activeWorkout: { ...state.activeWorkout, coolDownExercises } };
    }),

  setWarmUpStretchActualDuration: (exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = mapStretchLogs(
        state.activeWorkout.warmUpExercises,
        exerciseId,
        (ex) => ({ ...ex, actualDuration: seconds ?? undefined }),
      );
      return { activeWorkout: { ...state.activeWorkout, warmUpExercises } };
    }),

  setCoolDownStretchActualDuration: (exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = mapStretchLogs(
        state.activeWorkout.coolDownExercises,
        exerciseId,
        (ex) => ({ ...ex, actualDuration: seconds ?? undefined }),
      );
      return { activeWorkout: { ...state.activeWorkout, coolDownExercises } };
    }),

  setWarmUpStretchActualReps: (exerciseId, reps) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = mapStretchLogs(
        state.activeWorkout.warmUpExercises,
        exerciseId,
        (ex) => ({ ...ex, actualReps: reps ?? undefined }),
      );
      return { activeWorkout: { ...state.activeWorkout, warmUpExercises } };
    }),

  setCoolDownStretchActualReps: (exerciseId, reps) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = mapStretchLogs(
        state.activeWorkout.coolDownExercises,
        exerciseId,
        (ex) => ({ ...ex, actualReps: reps ?? undefined }),
      );
      return { activeWorkout: { ...state.activeWorkout, coolDownExercises } };
    }),

  setWorkoutNotes: (notes) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return { activeWorkout: { ...state.activeWorkout, notes } };
    }),

  completeWorkout: async () => {
    const state = get();
    if (!state.activeWorkout) return null;

    const inProgress = state.activeWorkout;
    const mode = useAuthStore.getState().mode;
    const auth = mode === "authenticated";
    const historyBefore = state.workoutHistory;
    const todayKey = formatLocalDateKey();
    const prepared = prepareCompleteWorkout({
      activeWorkout: inProgress,
      workoutHistory: historyBefore,
      todayKey,
      mode,
    });

    markWorkoutCompleting(inProgress.id);
    cancelScheduledPersistActiveWorkoutDraft();
    clearActiveWorkoutDraft(draftScope());

    set({
      activeWorkout: null,
      pausedWorkoutDate: prepared.pausedWorkoutDate,
      workoutHistory: prepared.workoutHistory,
    });

    const result = await persistCompletedWorkout({
      ...prepared,
      mode,
      workoutRepo: resolveWorkoutRepo(mode),
    });

    if (result.ok) {
      clearWorkoutCompleting(inProgress.id);
      void writeCompletedWorkoutToHealth(result.completed).catch(() => {
        // Optional mirror to Health Connect; in-app completion already succeeded.
      });
      return result.completed;
    }

    toastSaveError("workout", result.error);
    set({
      activeWorkout: inProgress,
      pausedWorkoutDate: state.pausedWorkoutDate,
      workoutHistory: historyBefore,
    });
    if (auth) {
      schedulePersistInProgressWorkout(inProgress, { paused: false });
    } else {
      schedulePersistActiveWorkoutDraft(draftScope(), inProgress);
    }
    clearWorkoutCompleting(inProgress.id);
    return null;
  },

  discardWorkout: () => {
    const state = get();
    if (state.activeWorkout?.endTime) {
      set({ activeWorkout: null });
      return;
    }
    const mode = useAuthStore.getState().mode;
    const scope = draftScope();
    cancelScheduledPersistActiveWorkoutDraft();
    cancelScheduledPersistInProgressWorkout();
    clearActiveWorkoutDraft(scope);

    const id =
      state.activeWorkout?.id ??
      (state.pausedWorkoutDate
        ? findInProgressWorkoutForDate(
            state.workoutHistory,
            state.pausedWorkoutDate,
          )?.id
        : undefined);

    const historyBefore = state.workoutHistory;
    set({ activeWorkout: null, pausedWorkoutDate: null });

    if (mode === "authenticated" && id) {
      set({ workoutHistory: historyBefore.filter((w) => w.id !== id) });
      void (async () => {
        try {
          await workoutRepo().deleteWorkout(id);
        } catch (err) {
          toastSaveError("workout", err);
          set({ workoutHistory: historyBefore });
        }
      })();
    }
  },

  pauseWorkout: () => {
    const state = get();
    if (!state.activeWorkout) return;
    const scope = draftScope();
    const mode = useAuthStore.getState().mode;
    cancelScheduledPersistActiveWorkoutDraft();
    cancelScheduledPersistInProgressWorkout();

    if (mode === "authenticated") {
      const pausedLog = hydrateWorkoutLog(
        workoutLogForPersistence({
          ...state.activeWorkout,
          paused: true,
          endTime: undefined,
        }),
      );
      const historyBefore = state.workoutHistory;
      set({
        activeWorkout: null,
        pausedWorkoutDate: state.activeWorkout.date,
        workoutHistory: upsertWorkoutInHistory(historyBefore, pausedLog),
      });
      void (async () => {
        try {
          await workoutRepo().saveWorkout(pausedLog);
        } catch (err) {
          toastSaveError("workout", err);
        }
      })();
      return;
    }

    saveActiveWorkoutDraft(scope, state.activeWorkout, { paused: true });
    set({
      activeWorkout: null,
      pausedWorkoutDate: state.activeWorkout.date,
    });
  },

  resumeWorkout: () => {
    const state = get();
    const mode = useAuthStore.getState().mode;
    const scope = draftScope();

    if (mode === "authenticated") {
      const dateKey = state.pausedWorkoutDate;
      if (!dateKey) return;
      const stored = findInProgressWorkoutForDate(state.workoutHistory, dateKey);
      if (!stored?.paused) return;
      const log = hydrateWorkoutLog({ ...stored, paused: false });
      set({
        activeWorkout: log,
        pausedWorkoutDate: null,
        workoutHistory: upsertWorkoutInHistory(state.workoutHistory, log),
      });
      void flushPersistInProgressWorkout(log, { paused: false });
      return;
    }

    const payload = loadActiveWorkoutDraft(scope);
    if (!payload?.meta.paused || payload.log.endTime) return;
    const log = hydrateWorkoutLog(payload.log);
    saveActiveWorkoutDraft(scope, log, { paused: false });
    set({ activeWorkout: log, pausedWorkoutDate: null });
  },

  updateCompletedWorkoutNotes: async (workoutId, notes) => {
    const state = get();
    const existing = state.workoutHistory.find((w) => w.id === workoutId);
    if (!existing) return;
    const updated = hydrateWorkoutLog({ ...existing, notes });
    const historyBefore = state.workoutHistory;
    set({
      workoutHistory: historyBefore.map((w) =>
        w.id === workoutId ? updated : w,
      ),
    });
    try {
      await workoutRepo().saveWorkout(updated);
    } catch (err) {
      toastSaveError("workout notes", err);
      set({ workoutHistory: historyBefore });
    }
  },

  startEditingCompletedWorkout: (workoutId) => {
    const state = get();
    if (state.activeWorkout) return false;
    const existing = state.workoutHistory.find((w) => w.id === workoutId);
    if (!existing?.endTime) return false;
    set({
      activeWorkout: hydrateWorkoutLog({
        ...existing,
        paused: false,
      }),
    });
    return true;
  },

  saveEditedWorkout: async () => {
    const state = get();
    const current = state.activeWorkout;
    if (!current?.endTime) return null;

    const saved = hydrateWorkoutLog(
      workoutLogForPersistence(
        stripMeaninglessCardioFromWorkout({
          ...current,
          paused: false,
          endTime: current.endTime,
          startTime: current.startTime,
        }),
      ),
    );
    const historyBefore = state.workoutHistory;

    set({
      activeWorkout: null,
      workoutHistory: historyBefore.map((w) =>
        w.id === saved.id ? saved : w,
      ),
    });

    try {
      await workoutRepo().saveWorkout(saved);
      return saved;
    } catch (err) {
      toastSaveError("workout", err);
      set({
        activeWorkout: current,
        workoutHistory: historyBefore,
      });
      return null;
    }
  },

  cancelEditingWorkout: () => {
    const state = get();
    if (!state.activeWorkout?.endTime) return;
    set({ activeWorkout: null });
  },

  syncStretchTargetsFromLibrary: () =>
    set((state) => {
      if (!state.activeWorkout || state.activeWorkout.endTime) return state;
      return {
        activeWorkout: {
          ...state.activeWorkout,
          warmUpExercises: syncStretchLogsFromLibrary(
            state.activeWorkout.warmUpExercises,
          ),
          coolDownExercises: syncStretchLogsFromLibrary(
            state.activeWorkout.coolDownExercises,
          ),
        },
      };
    }),

  reconcileDayBoundary: async () => {
    const mode = useAuthStore.getState().mode;
    if (mode === "loading") return;
    const todayKey = formatLocalDateKey();
    const scope = draftScope();
    const state = get();
    let workoutHistory = state.workoutHistory;
    const { history, changedIds } = pauseStaleInProgressLogs(
      workoutHistory,
      todayKey,
    );
    workoutHistory = history;

    if (mode === "authenticated" && changedIds.length > 0) {
      for (const id of changedIds) {
        const row = workoutHistory.find((w) => w.id === id);
        if (!row) continue;
        try {
          await workoutRepo().saveWorkout(
            hydrateWorkoutLog(workoutLogForPersistence({ ...row, paused: true })),
          );
        } catch (err) {
          toastSaveError("workout draft", err);
        }
      }
    }

    let activeWorkout = state.activeWorkout;
    if (
      activeWorkout &&
      !activeWorkout.endTime &&
      isStaleSessionDate(activeWorkout.date, todayKey)
    ) {
      const pausedLog = hydrateWorkoutLog(
        workoutLogForPersistence({
          ...activeWorkout,
          paused: true,
          endTime: undefined,
        }),
      );
      workoutHistory = upsertWorkoutInHistory(workoutHistory, pausedLog);
      cancelScheduledPersistActiveWorkoutDraft();
      cancelScheduledPersistInProgressWorkout();
      if (mode === "authenticated") {
        try {
          await workoutRepo().saveWorkout(pausedLog);
        } catch (err) {
          toastSaveError("workout draft", err);
        }
      } else {
        saveActiveWorkoutDraft(scope, activeWorkout, { paused: true });
      }
      activeWorkout = null;
    }

    const pausedWorkoutDate =
      mode === "authenticated"
        ? getPausedWorkoutDateForToday(workoutHistory, todayKey)
        : getPausedDraftDate(scope, todayKey);

    set({ workoutHistory, activeWorkout, pausedWorkoutDate });
  },

  discardStaleWorkout: (workoutId) => {
    const state = get();
    const target = state.workoutHistory.find((w) => w.id === workoutId);
    if (!target || target.endTime != null) return;
    if (!isStaleSessionDate(target.date)) return;

    const mode = useAuthStore.getState().mode;
    const scope = draftScope();
    cancelScheduledPersistActiveWorkoutDraft();
    cancelScheduledPersistInProgressWorkout();

    const historyBefore = state.workoutHistory;
    const todayKey = formatLocalDateKey();
    const pausedWorkoutDate =
      state.pausedWorkoutDate === target.date
        ? null
        : mode === "authenticated"
          ? getPausedWorkoutDateForToday(
              historyBefore.filter((w) => w.id !== workoutId),
              todayKey,
            )
          : getPausedDraftDate(scope, todayKey);

    set({
      activeWorkout:
        state.activeWorkout?.id === workoutId ? null : state.activeWorkout,
      pausedWorkoutDate,
      workoutHistory: historyBefore.filter((w) => w.id !== workoutId),
    });

    if (mode === "authenticated") {
      void (async () => {
        try {
          await workoutRepo().deleteWorkout(workoutId);
        } catch (err) {
          toastSaveError("workout", err);
          set({ workoutHistory: historyBefore, pausedWorkoutDate: state.pausedWorkoutDate });
        }
      })();
    } else if (loadActiveWorkoutDraft(scope)?.log.id === workoutId) {
      clearActiveWorkoutDraft(scope);
    }
  },

  invalidateHistory: (options) => {
    historyLoadInFlight = null;
    if (options?.clearData) {
      set({
        historyLoadedForAuthKey: null,
        workoutHistory: [],
        activeWorkout: null,
        pausedWorkoutDate: null,
      });
      return;
    }
    set({ historyLoadedForAuthKey: null });
  },

  loadHistory: async (options) => {
    const { mode, user } = useAuthStore.getState();
    if (mode === "loading") return; // Wait until AuthInitializer settles.
    const authKey = settingsHydrationKey(mode, user?.id);
    if (!authKey) return;

    if (!options?.force && get().historyLoadedForAuthKey === authKey) {
      return;
    }
    if (!options?.force && historyLoadInFlight) {
      await historyLoadInFlight;
      return;
    }

    const run = async () => {
    const scope = draftScope();
    const todayKey = formatLocalDateKey();
    let workoutHistory = (await resolveWorkoutRepo(mode).loadHistory()).map(
      hydrateWorkoutLog,
    );

    if (mode === "authenticated") {
      const local = loadActiveWorkoutDraft(scope);
      if (local) {
        const cloud = findInProgressWorkoutForDate(
          workoutHistory,
          local.log.date,
        );
        if (
          !cloud &&
          !findCompletedWorkoutForDate(workoutHistory, local.log.date)
        ) {
          const migrated = hydrateWorkoutLog(
            workoutLogForPersistence({
              ...local.log,
              paused: local.meta.paused,
              endTime: undefined,
            }),
          );
          try {
            await workoutRepo().saveWorkout(migrated);
            workoutHistory = upsertWorkoutInHistory(workoutHistory, migrated);
          } catch (err) {
            toastSaveError("workout draft", err);
          }
        }
        clearActiveWorkoutDraft(scope);
      }
    }

    const stalePause = pauseStaleInProgressLogs(workoutHistory, todayKey);
    workoutHistory = stalePause.history;
    if (mode === "authenticated" && stalePause.changedIds.length > 0) {
      for (const id of stalePause.changedIds) {
        const row = workoutHistory.find((w) => w.id === id);
        if (!row) continue;
        try {
          await workoutRepo().saveWorkout(
            hydrateWorkoutLog(workoutLogForPersistence({ ...row, paused: true })),
          );
        } catch (err) {
          toastSaveError("workout draft", err);
        }
      }
    }

    const cardioOnlyFinalized = finalizeCardioOnlyQuickLogsInHistory(workoutHistory);
    workoutHistory = cardioOnlyFinalized.history;
    if (mode === "authenticated" && cardioOnlyFinalized.changed.length > 0) {
      for (const row of cardioOnlyFinalized.changed) {
        try {
          await workoutRepo().saveWorkout(
            hydrateWorkoutLog(workoutLogForPersistence(row)),
          );
        } catch (err) {
          toastSaveError("activity log", err);
        }
      }
    }

    const enriched = await refreshAppTrackedCardioHealthEnrich(
      workoutHistory,
      todayKey,
    );
    workoutHistory = enriched.history;
    if (mode === "authenticated" && enriched.changed.length > 0) {
      for (const row of enriched.changed) {
        try {
          await workoutRepo().saveWorkout(
            hydrateWorkoutLog(workoutLogForPersistence(row)),
          );
        } catch (err) {
          toastSaveError("activity log", err);
        }
      }
    }

    const current = get();
    let activeWorkout = current.activeWorkout;
    if (
      activeWorkout &&
      !activeWorkout.endTime &&
      isCardioOnlyQuickLogWorkout(activeWorkout)
    ) {
      const finalized = finalizeCardioOnlyQuickLogWorkout(activeWorkout);
      workoutHistory = upsertWorkoutInHistory(workoutHistory, finalized);
      if (mode === "authenticated") {
        try {
          await workoutRepo().saveWorkout(
            hydrateWorkoutLog(workoutLogForPersistence(finalized)),
          );
        } catch (err) {
          toastSaveError("activity log", err);
        }
      }
      activeWorkout = null;
    }
    if (
      activeWorkout &&
      !activeWorkout.endTime &&
      isStaleSessionDate(activeWorkout.date, todayKey)
    ) {
      const pausedLog = hydrateWorkoutLog(
        workoutLogForPersistence({
          ...activeWorkout,
          paused: true,
          endTime: undefined,
        }),
      );
      workoutHistory = upsertWorkoutInHistory(workoutHistory, pausedLog);
      if (mode === "authenticated") {
        try {
          await workoutRepo().saveWorkout(pausedLog);
        } catch (err) {
          toastSaveError("workout draft", err);
        }
      } else {
        saveActiveWorkoutDraft(scope, activeWorkout, { paused: true });
      }
      activeWorkout = null;
    }

    if (!activeWorkout) {
      if (mode === "authenticated") {
        const restored = shouldAutoRestoreInProgressFromHistory(
          workoutHistory,
          todayKey,
        );
        if (restored) activeWorkout = hydrateWorkoutLog(restored);
      } else {
        const restored = shouldAutoRestoreDraft(scope, workoutHistory, todayKey);
        if (restored) activeWorkout = hydrateWorkoutLog(restored);
      }
    }

    const pausedWorkoutDate =
      mode === "authenticated"
        ? getPausedWorkoutDateForToday(workoutHistory, todayKey)
        : getPausedDraftDate(scope, todayKey);

    set({
      workoutHistory,
      pausedWorkoutDate,
      historyLoadedForAuthKey: authKey,
      ...(activeWorkout && !current.activeWorkout ? { activeWorkout } : {}),
    });
    };

    historyLoadInFlight = run();
    try {
      await historyLoadInFlight;
    } finally {
      historyLoadInFlight = null;
    }
  },
  };
});

if (typeof window !== "undefined") {
  useWorkoutStore.subscribe((state, prevState) => {
    const log = state.activeWorkout;
    if (!log || log === prevState.activeWorkout) return;
    if (log.endTime) return;
    const mode = useAuthStore.getState().mode;
    if (mode === "authenticated") {
      const prepared = hydrateWorkoutLog(
        workoutLogForPersistence({
          ...log,
          paused: false,
          endTime: undefined,
        }),
      );
      useWorkoutStore.setState((s) => ({
        workoutHistory: upsertWorkoutInHistory(s.workoutHistory, prepared),
      }));
      schedulePersistInProgressWorkout(log, { paused: false });
      return;
    }
    schedulePersistActiveWorkoutDraft(draftScope(), log);
  });
}

registerPrescribedPlanFreezeStateReader(() => {
  const state = useWorkoutStore.getState();
  return {
    activeWorkout: state.activeWorkout,
    pausedWorkoutDate: state.pausedWorkoutDate,
    workoutHistory: state.workoutHistory,
    historyLoadedForAuthKey: state.historyLoadedForAuthKey,
  };
});
