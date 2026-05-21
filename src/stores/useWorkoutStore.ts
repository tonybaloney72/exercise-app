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
import { resolveStretchesForWorkoutStart } from "@/lib/stretchResolveContext";
import {
  getBackfillEligibility,
  localNoonIsoForDateKey,
} from "@/lib/backfillWorkout";
import { parseLocalDateKey, weekKeyFromDateKey } from "@/utils/weekCalendar";
import { getWorkoutRepo } from "@/lib/repos";
import {
  buildEmptyCardioLogs,
  CARDIO_KIND_TO_EXERCISE_ID,
  resolveCardioActivities,
} from "@/lib/cardioActivities";
import { workoutLogForPersistence } from "@/lib/workoutCardioPersistence";
import { getCardioLog, patchCardioLog } from "@/lib/cardioWorkoutLog";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getSwapCandidates,
  pickRandomSwap,
  swapCandidatePrefsFromStores,
} from "@/lib/exerciseSwap";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { exerciseMap } from "@/data/exercises";
import {
  clearExerciseMetrics,
  hydrateWorkoutLog,
} from "@/utils/exerciseLogDefaults";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  formatPlanTargetPrescription,
  resolveExerciseSettings,
  resolveStretchTimerTargetSeconds,
} from "@/utils/effectiveExerciseSettings";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { toastSaveError } from "@/utils/saveErrorToast";
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
  flushPersistInProgressWorkout,
  schedulePersistInProgressWorkout,
  upsertWorkoutInHistory,
} from "@/lib/inProgressWorkoutSync";
import {
  pauseStaleInProgressLogs,
  isStaleSessionDate,
} from "@/lib/workoutSessionStale";
import {
  findCompletedWorkoutForDate,
  findInProgressWorkoutForDate,
  getPausedWorkoutDateForToday,
  shouldAutoRestoreInProgressFromHistory,
} from "@/utils/workoutLogLookup";
import {
  addCardioKind,
  addRoundAt,
  removeCardioAt,
  removeCoolDownStretchAt,
  removeRoundExerciseAt,
  removeWarmUpStretchAt,
} from "@/lib/workoutLogStructure";

function draftScope(): DraftAuthScope {
  const auth = useAuthStore.getState();
  return { mode: auth.mode, userId: auth.user?.id ?? null };
}

function seedTimerTargetSecondsFromResolved(
  resolved: ReturnType<typeof resolveExerciseSettings>,
): number | undefined {
  if (resolved.defaultSetMode !== "timer") return undefined;
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
  toggleJog: () => void;
  skipJog: () => void;
  unskipJog: () => void;
  setJogDistance: (distance: number | undefined) => void;
  setJogDurationSeconds: (seconds: number | undefined) => void;
  toggleCardio: (exerciseId: string) => void;
  skipCardio: (exerciseId: string) => void;
  unskipCardio: (exerciseId: string) => void;
  setCardioDistance: (exerciseId: string, distance: number | undefined) => void;
  setCardioDurationSeconds: (
    exerciseId: string,
    seconds: number | undefined,
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
  removeRoundExercise: (roundNumber: number, slotIndex: number) => void;
  addRoundExercise: (roundNumber: number, exerciseId: string) => void;
  removeWarmUpStretchFromWorkout: (exerciseId: string) => void;
  addWarmUpStretchToWorkout: (exerciseId: string) => void;
  removeCoolDownStretchFromWorkout: (exerciseId: string) => void;
  addCoolDownStretchToWorkout: (exerciseId: string) => void;
  removeCardioFromWorkout: (exerciseId: string) => void;
  addCardioToWorkout: (kind: CardioActivityKind) => void;

  loadHistory: () => Promise<void>;
  /** Pause prior-day in-progress rows and clear a stale live session (midnight rules). */
  reconcileDayBoundary: () => Promise<void>;
  /** Delete an unfinished workout from a previous calendar day. */
  discardStaleWorkout: (workoutId: string) => void;
  /** Re-apply Library timer defaults to warm-up / cool-down on an active workout. */
  syncStretchTargetsFromLibrary: () => void;
}

function buildEmptyRoundLogs(plan: DayPlan): RoundLog[] {
  const byId = useExerciseSettingsStore.getState().byExerciseId;
  return plan.rounds.map((round) => ({
    roundNumber: round.roundNumber,
    exercises: round.exercises.map((ex): ExerciseLog => {
      const meta = exerciseMap[ex.exerciseId];
      const resolved = resolveExerciseSettings(
        meta ?? {
          id: ex.exerciseId,
          isTimeBased: false,
          category: ex.category,
          name: "",
          defaultReps: "",
          notes: "",
        },
        byId[ex.exerciseId],
      );
      const targetPrescription = formatPlanTargetPrescription(
        meta ?? {
          id: ex.exerciseId,
          isTimeBased: false,
          defaultReps: ex.targetReps,
        },
        byId[ex.exerciseId],
      );
      return {
        exerciseId: ex.exerciseId,
        completed: false,
        skipped: false,
        targetPrescription,
        loggingMode: resolved.defaultSetMode,
        targetDurationSeconds: seedTimerTargetSecondsFromResolved(resolved),
      };
    }),
  }));
}

export const useWorkoutStore = create<WorkoutState>((set, get) => {
  const beginWorkoutSession = async (
    plan: DayPlan,
    dateKey: string,
    startTimeIso: string,
    dayOfWeek: number,
    weekAnchorDateKey?: string,
  ) => {
    const state = get();
    const existing = findInProgressWorkoutForDate(state.workoutHistory, dateKey);
    if (existing) {
      const log = hydrateWorkoutLog({ ...existing, paused: false });
      const mode = useAuthStore.getState().mode;
      set({
        pausedWorkoutDate: null,
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

    const { warmUp, coolDown } = await resolveStretchesForWorkoutStart(
      plan,
      weekAnchorDateKey,
    );
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
      pausedWorkoutDate: null,
      activeWorkout: log,
      ...(mode === "authenticated"
        ? { workoutHistory: upsertWorkoutInHistory(state.workoutHistory, log) }
        : {}),
    });
    if (mode === "authenticated") {
      void flushPersistInProgressWorkout(log, { paused: false });
    }
  };

  return {
  activeWorkout: null,
  workoutHistory: [],
  pausedWorkoutDate: null,
  startWorkout: (plan) => {
    const now = new Date();
    void beginWorkoutSession(
      plan,
      formatLocalDateKey(now),
      now.toISOString(),
      now.getDay(),
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

  toggleJog: () => get().toggleCardio(CARDIO_KIND_TO_EXERCISE_ID.jog),

  skipJog: () => get().skipCardio(CARDIO_KIND_TO_EXERCISE_ID.jog),

  unskipJog: () => get().unskipCardio(CARDIO_KIND_TO_EXERCISE_ID.jog),

  setJogDistance: (distance) =>
    get().setCardioDistance(CARDIO_KIND_TO_EXERCISE_ID.jog, distance),

  setJogDurationSeconds: (seconds) =>
    get().setCardioDurationSeconds(CARDIO_KIND_TO_EXERCISE_ID.jog, seconds),

  toggleCardio: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const current = getCardioLog(state.activeWorkout, exerciseId);
      return {
        activeWorkout: patchCardioLog(state.activeWorkout, exerciseId, {
          completed: !(current?.completed ?? false),
          skipped: false,
        }),
      };
    }),

  skipCardio: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: patchCardioLog(state.activeWorkout, exerciseId, {
          skipped: true,
          completed: false,
        }),
      };
    }),

  unskipCardio: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: patchCardioLog(state.activeWorkout, exerciseId, {
          skipped: false,
        }),
      };
    }),

  setCardioDistance: (exerciseId, distance) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: patchCardioLog(state.activeWorkout, exerciseId, {
          actualDistanceMi: distance,
        }),
      };
    }),

  setCardioDurationSeconds: (exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: patchCardioLog(state.activeWorkout, exerciseId, {
          actualDuration: seconds,
        }),
      };
    }),

  toggleWarmUpStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = state.activeWorkout.warmUpExercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const nextDone = !ex.completed;
        if (!nextDone) {
          return { ...clearExerciseMetrics(ex), completed: false, skipped: false };
        }
        return { ...ex, completed: true, skipped: false };
      });
      const warmUpCompleted = warmUpExercises.every((ex) => ex.completed || ex.skipped);
      return {
        activeWorkout: { ...state.activeWorkout, warmUpExercises, warmUpCompleted },
      };
    }),

  toggleCoolDownStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = state.activeWorkout.coolDownExercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const nextDone = !ex.completed;
        if (!nextDone) {
          return { ...clearExerciseMetrics(ex), completed: false, skipped: false };
        }
        return { ...ex, completed: true, skipped: false };
      });
      const coolDownCompleted = coolDownExercises.every((ex) => ex.completed || ex.skipped);
      return {
        activeWorkout: { ...state.activeWorkout, coolDownExercises, coolDownCompleted },
      };
    }),

  toggleExercise: (roundNumber, exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = state.activeWorkout.rounds.map((r) => {
        if (r.roundNumber !== roundNumber) return r;
        return {
          ...r,
          exercises: r.exercises.map((ex) => {
            if (ex.exerciseId !== exerciseId) return ex;
            const nextDone = !ex.completed;
            if (!nextDone) {
              return { ...clearExerciseMetrics(ex), completed: false, skipped: false };
            }
            return { ...ex, completed: true, skipped: false };
          }),
        };
      });
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  setActualReps: (roundNumber, exerciseId, reps) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = state.activeWorkout.rounds.map((r) => {
        if (r.roundNumber !== roundNumber) return r;
        return {
          ...r,
          exercises: r.exercises.map((ex) => {
            if (ex.exerciseId !== exerciseId) return ex;
            return { ...ex, actualReps: reps ?? undefined };
          }),
        };
      });
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  setActualDuration: (roundNumber, exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = state.activeWorkout.rounds.map((r) => {
        if (r.roundNumber !== roundNumber) return r;
        return {
          ...r,
          exercises: r.exercises.map((ex) => {
            if (ex.exerciseId !== exerciseId) return ex;
            return {
              ...ex,
              actualDuration: seconds ?? undefined,
            };
          }),
        };
      });
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  setTargetDuration: (roundNumber, exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = state.activeWorkout.rounds.map((r) => {
        if (r.roundNumber !== roundNumber) return r;
        return {
          ...r,
          exercises: r.exercises.map((ex) => {
            if (ex.exerciseId !== exerciseId) return ex;
            if (seconds == null || Number.isNaN(seconds)) {
              return { ...ex, targetDurationSeconds: undefined };
            }
            const clamped = Math.min(999, Math.max(5, Math.round(seconds)));
            return { ...ex, targetDurationSeconds: clamped };
          }),
        };
      });
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
              targetDurationSeconds: seedTimerTargetSecondsFromResolved(resolved),
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
                  return {
                    ...ex,
                    swappedWith: substituteId,
                    skipped: false,
                    actualReps: undefined,
                    actualDuration: undefined,
                    loggingMode: resolved.defaultSetMode,
                    targetDurationSeconds:
                      seedTimerTargetSecondsFromResolved(resolved),
                    targetPrescription:
                      exerciseMap[substituteId]?.defaultReps ?? ex.targetPrescription,
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
                  return {
                    ...ex,
                    swappedWith: undefined,
                    actualReps: undefined,
                    actualDuration: undefined,
                    loggingMode: resolved.defaultSetMode,
                    targetDurationSeconds:
                      seedTimerTargetSecondsFromResolved(resolved),
                    targetPrescription:
                      exerciseMap[ex.exerciseId]?.defaultReps ?? ex.targetPrescription,
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
      const resolved = resolveExerciseSettings(meta, byId[exerciseId]);
      const targetPrescription = formatPlanTargetPrescription(meta, byId[exerciseId]);
      const loggingMode = resolved.defaultSetMode;
      const targetDurationSeconds = seedTimerTargetSecondsFromResolved(resolved);
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

  removeCardioFromWorkout: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: hydrateWorkoutLog(
          removeCardioAt(state.activeWorkout, exerciseId),
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

  skipExercise: (roundNumber, exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = state.activeWorkout.rounds.map((r) => {
        if (r.roundNumber !== roundNumber) return r;
        return {
          ...r,
          exercises: r.exercises.map((ex) => {
            if (ex.exerciseId !== exerciseId) return ex;
            return {
              ...clearExerciseMetrics(ex),
              skipped: true,
              completed: false,
            };
          }),
        };
      });
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  unskipExercise: (roundNumber, exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = state.activeWorkout.rounds.map((r) => {
        if (r.roundNumber !== roundNumber) return r;
        return {
          ...r,
          exercises: r.exercises.map((ex) => {
            if (ex.exerciseId !== exerciseId) return ex;
            return { ...ex, skipped: false };
          }),
        };
      });
      return { activeWorkout: { ...state.activeWorkout, rounds } };
    }),

  skipWarmUpStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = state.activeWorkout.warmUpExercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        return {
          ...clearExerciseMetrics(ex),
          skipped: true,
          completed: false,
        };
      });
      const warmUpCompleted = warmUpExercises.every((ex) => ex.completed || ex.skipped);
      return {
        activeWorkout: { ...state.activeWorkout, warmUpExercises, warmUpCompleted },
      };
    }),

  unskipWarmUpStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = state.activeWorkout.warmUpExercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        return { ...ex, skipped: false };
      });
      const warmUpCompleted = warmUpExercises.every((ex) => ex.completed || ex.skipped);
      return {
        activeWorkout: { ...state.activeWorkout, warmUpExercises, warmUpCompleted },
      };
    }),

  skipCoolDownStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = state.activeWorkout.coolDownExercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        return {
          ...clearExerciseMetrics(ex),
          skipped: true,
          completed: false,
        };
      });
      const coolDownCompleted = coolDownExercises.every((ex) => ex.completed || ex.skipped);
      return {
        activeWorkout: { ...state.activeWorkout, coolDownExercises, coolDownCompleted },
      };
    }),

  unskipCoolDownStretch: (exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = state.activeWorkout.coolDownExercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        return { ...ex, skipped: false };
      });
      const coolDownCompleted = coolDownExercises.every((ex) => ex.completed || ex.skipped);
      return {
        activeWorkout: { ...state.activeWorkout, coolDownExercises, coolDownCompleted },
      };
    }),

  setWarmUpStretchTargetDuration: (exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = state.activeWorkout.warmUpExercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        if (seconds == null || Number.isNaN(seconds)) {
          return { ...ex, targetDurationSeconds: undefined };
        }
        const clamped = Math.min(999, Math.max(5, Math.round(seconds)));
        return { ...ex, targetDurationSeconds: clamped };
      });
      return { activeWorkout: { ...state.activeWorkout, warmUpExercises } };
    }),

  setCoolDownStretchTargetDuration: (exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = state.activeWorkout.coolDownExercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        if (seconds == null || Number.isNaN(seconds)) {
          return { ...ex, targetDurationSeconds: undefined };
        }
        const clamped = Math.min(999, Math.max(5, Math.round(seconds)));
        return { ...ex, targetDurationSeconds: clamped };
      });
      return { activeWorkout: { ...state.activeWorkout, coolDownExercises } };
    }),

  setWarmUpStretchActualDuration: (exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const warmUpExercises = state.activeWorkout.warmUpExercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        return {
          ...ex,
          actualDuration: seconds ?? undefined,
        };
      });
      return { activeWorkout: { ...state.activeWorkout, warmUpExercises } };
    }),

  setCoolDownStretchActualDuration: (exerciseId, seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const coolDownExercises = state.activeWorkout.coolDownExercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        return {
          ...ex,
          actualDuration: seconds ?? undefined,
        };
      });
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
    const finished: WorkoutLog = {
      ...inProgress,
      endTime: new Date().toISOString(),
      paused: false,
    };
    const completed = hydrateWorkoutLog(workoutLogForPersistence(finished));
    const historyBefore = state.workoutHistory;
    const auth = useAuthStore.getState().mode === "authenticated";

    cancelScheduledPersistActiveWorkoutDraft();
    cancelScheduledPersistInProgressWorkout();
    clearActiveWorkoutDraft(draftScope());

    // Optimistic UI: update store first so the user gets immediate feedback.
    set({
      activeWorkout: null,
      pausedWorkoutDate: null,
      workoutHistory: [completed, ...historyBefore],
    });

    try {
      await getWorkoutRepo().saveWorkout(completed);
      return completed;
    } catch (err) {
      toastSaveError("workout", err);
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
      return null;
    }
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
          await getWorkoutRepo().deleteWorkout(id);
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
          await getWorkoutRepo().saveWorkout(pausedLog);
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
      await getWorkoutRepo().saveWorkout(updated);
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
      workoutLogForPersistence({
        ...current,
        paused: false,
        endTime: current.endTime,
        startTime: current.startTime,
      }),
    );
    const historyBefore = state.workoutHistory;

    set({
      activeWorkout: null,
      workoutHistory: historyBefore.map((w) =>
        w.id === saved.id ? saved : w,
      ),
    });

    try {
      await getWorkoutRepo().saveWorkout(saved);
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
          await getWorkoutRepo().saveWorkout(
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
          await getWorkoutRepo().saveWorkout(pausedLog);
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
          await getWorkoutRepo().deleteWorkout(workoutId);
        } catch (err) {
          toastSaveError("workout", err);
          set({ workoutHistory: historyBefore, pausedWorkoutDate: state.pausedWorkoutDate });
        }
      })();
    } else if (loadActiveWorkoutDraft(scope)?.log.id === workoutId) {
      clearActiveWorkoutDraft(scope);
    }
  },

  loadHistory: async () => {
    const mode = useAuthStore.getState().mode;
    if (mode === "loading") return; // Wait until AuthInitializer settles.
    const scope = draftScope();
    const todayKey = formatLocalDateKey();
    let workoutHistory = (await getWorkoutRepo(mode).loadHistory()).map(
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
            await getWorkoutRepo().saveWorkout(migrated);
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
          await getWorkoutRepo().saveWorkout(
            hydrateWorkoutLog(workoutLogForPersistence({ ...row, paused: true })),
          );
        } catch (err) {
          toastSaveError("workout draft", err);
        }
      }
    }

    const current = get();
    let activeWorkout = current.activeWorkout;
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
          await getWorkoutRepo().saveWorkout(pausedLog);
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
      ...(activeWorkout && !current.activeWorkout ? { activeWorkout } : {}),
    });
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
