"use client";

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  WorkoutLog,
  RoundLog,
  ExerciseLog,
  DayPlan,
  ExerciseCategory,
  ExerciseSetMode,
  StretchEntry,
} from "@/types";
import { resolveStretchesForPlan } from "@/lib/stretchResolveContext";
import { getWorkoutRepo } from "@/lib/repos";
import {
  buildEmptyCardioLogs,
  CARDIO_KIND_TO_EXERCISE_ID,
  resolveCardioActivities,
  syncLegacyJogFieldsFromCardioLogs,
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

  loadHistory: () => Promise<void>;
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

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeWorkout: null,
  workoutHistory: [],
  pausedWorkoutDate: null,
  startWorkout: (plan) => {
    const now = new Date();
    const { warmUp, coolDown } = resolveStretchesForPlan(plan);
    const warmUpExercises: ExerciseLog[] = warmUp.map(buildStretchExerciseLog);
    const coolDownExercises: ExerciseLog[] = coolDown.map(buildStretchExerciseLog);
    const cardioExercises = buildEmptyCardioLogs(resolveCardioActivities(plan));
    set({
      pausedWorkoutDate: null,
      activeWorkout: {
        id: uuidv4(),
        date: formatLocalDateKey(now),
        dayOfWeek: now.getDay(),
        jogCompleted: false,
        jogSkipped: false,
        cardioExercises,
        warmUpCompleted: false,
        warmUpExercises,
        coolDownCompleted: false,
        coolDownExercises,
        rounds: buildEmptyRoundLogs(plan),
        startTime: now.toISOString(),
      },
    });
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

    const finished: WorkoutLog = {
      ...state.activeWorkout,
      endTime: new Date().toISOString(),
    };
    syncLegacyJogFieldsFromCardioLogs(finished);
    const completed = hydrateWorkoutLog(workoutLogForPersistence(finished));

    cancelScheduledPersistActiveWorkoutDraft();
    clearActiveWorkoutDraft(draftScope());

    // Optimistic UI: update store first so the user gets immediate feedback.
    set((s) => ({
      activeWorkout: null,
      pausedWorkoutDate: null,
      workoutHistory: [completed, ...s.workoutHistory],
    }));

    try {
      await getWorkoutRepo().saveWorkout(completed);
    } catch (err) {
      console.error("[useWorkoutStore.completeWorkout]", err);
      // The optimistic state stays — surface errors via a toast in a later slice.
    }

    return completed;
  },

  discardWorkout: () => {
    cancelScheduledPersistActiveWorkoutDraft();
    clearActiveWorkoutDraft(draftScope());
    set({ activeWorkout: null, pausedWorkoutDate: null });
  },

  pauseWorkout: () => {
    const state = get();
    if (!state.activeWorkout) return;
    const scope = draftScope();
    cancelScheduledPersistActiveWorkoutDraft();
    saveActiveWorkoutDraft(scope, state.activeWorkout, { paused: true });
    set({
      activeWorkout: null,
      pausedWorkoutDate: state.activeWorkout.date,
    });
  },

  resumeWorkout: () => {
    const scope = draftScope();
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
    set({
      workoutHistory: state.workoutHistory.map((w) =>
        w.id === workoutId ? updated : w,
      ),
    });
    try {
      await getWorkoutRepo().saveWorkout(updated);
    } catch (err) {
      console.error("[useWorkoutStore.updateCompletedWorkoutNotes]", err);
    }
  },

  syncStretchTargetsFromLibrary: () =>
    set((state) => {
      if (!state.activeWorkout) return state;
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

  loadHistory: async () => {
    const mode = useAuthStore.getState().mode;
    if (mode === "loading") return; // Wait until AuthInitializer settles.
    const scope = draftScope();
    const history = await getWorkoutRepo(mode).loadHistory();
    const workoutHistory = history.map(hydrateWorkoutLog);
    const pausedWorkoutDate = getPausedDraftDate(scope);

    const current = get();
    let activeWorkout = current.activeWorkout;
    if (!activeWorkout) {
      const restored = shouldAutoRestoreDraft(scope, workoutHistory);
      if (restored) activeWorkout = hydrateWorkoutLog(restored);
    }

    set({
      workoutHistory,
      pausedWorkoutDate,
      ...(activeWorkout && !current.activeWorkout ? { activeWorkout } : {}),
    });
  },
}));

if (typeof window !== "undefined") {
  useWorkoutStore.subscribe((state, prevState) => {
    const log = state.activeWorkout;
    if (!log || log === prevState.activeWorkout) return;
    schedulePersistActiveWorkoutDraft(draftScope(), log);
  });
}
