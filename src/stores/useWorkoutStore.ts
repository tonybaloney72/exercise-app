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
} from "@/types";
import { DEFAULT_WARM_UP, DEFAULT_COOL_DOWN } from "@/data/stretches";
import { getWorkoutRepo } from "@/lib/repos";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { useAuthStore } from "@/stores/useAuthStore";
import { getSwapCandidates, pickRandomSwap } from "@/lib/exerciseSwap";
import { exerciseMap } from "@/data/exercises";
import {
  clearExerciseMetrics,
  ensureExerciseMetrics,
  hydrateWorkoutLog,
} from "@/utils/exerciseLogDefaults";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  resolveExerciseSettings,
} from "@/utils/effectiveExerciseSettings";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";

function seedTimerTargetSecondsFromResolved(
  resolved: ReturnType<typeof resolveExerciseSettings>,
): number | undefined {
  if (resolved.defaultSetMode !== "timer") return undefined;
  const sec = resolved.defaultTimerSeconds ?? DEFAULT_TIMER_SECONDS_FALLBACK;
  return Math.min(999, Math.max(5, sec));
}

interface WorkoutState {
  activeWorkout: WorkoutLog | null;
  workoutHistory: WorkoutLog[];
  startWorkout: (plan: DayPlan) => void;
  toggleJog: () => void;
  skipJog: () => void;
  unskipJog: () => void;
  setJogDistance: (distance: number | undefined) => void;
  setJogDurationSeconds: (seconds: number | undefined) => void;
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
  setWorkoutNotes: (notes: string) => void;
  completeWorkout: () => Promise<WorkoutLog | null>;
  discardWorkout: () => void;
  /** Update notes on a finished workout (same id upsert via repo). */
  updateCompletedWorkoutNotes: (
    workoutId: string,
    notes: string,
  ) => Promise<void>;

  loadHistory: () => Promise<void>;
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
      return {
        exerciseId: ex.exerciseId,
        completed: false,
        skipped: false,
        targetPrescription: ex.targetReps,
        loggingMode: resolved.defaultSetMode,
        targetDurationSeconds: seedTimerTargetSecondsFromResolved(resolved),
      };
    }),
  }));
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeWorkout: null,
  workoutHistory: [],
  startWorkout: (plan) => {
    const now = new Date();
    const warmUpExercises: ExerciseLog[] = DEFAULT_WARM_UP.map((s) => ({
      exerciseId: s.exerciseId,
      completed: false,
      skipped: false,
      targetPrescription: s.targetReps,
    }));
    const coolDownExercises: ExerciseLog[] = DEFAULT_COOL_DOWN.map((s) => ({
      exerciseId: s.exerciseId,
      completed: false,
      skipped: false,
      targetPrescription: s.targetReps,
    }));
    set({
      activeWorkout: {
        id: uuidv4(),
        date: formatLocalDateKey(now),
        dayOfWeek: now.getDay(),
        jogCompleted: false,
        jogSkipped: false,
        warmUpCompleted: false,
        warmUpExercises,
        coolDownCompleted: false,
        coolDownExercises,
        rounds: buildEmptyRoundLogs(plan),
        startTime: now.toISOString(),
      },
    });
  },

  toggleJog: () =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: {
          ...state.activeWorkout,
          jogCompleted: !state.activeWorkout.jogCompleted,
          jogSkipped: false,
        },
      };
    }),

  skipJog: () =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: {
          ...state.activeWorkout,
          jogSkipped: true,
          jogCompleted: false,
        },
      };
    }),

  unskipJog: () =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: { ...state.activeWorkout, jogSkipped: false },
      };
    }),

  setJogDistance: (distance) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: { ...state.activeWorkout, jogDistance: distance },
      };
    }),

  setJogDurationSeconds: (seconds) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return {
        activeWorkout: { ...state.activeWorkout, jogDurationSeconds: seconds },
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
        return ensureExerciseMetrics({
          ...ex,
          completed: true,
          skipped: false,
        });
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
        return ensureExerciseMetrics({
          ...ex,
          completed: true,
          skipped: false,
        });
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
            return ensureExerciseMetrics({
              ...ex,
              completed: true,
              skipped: false,
            });
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
            let next: ExerciseLog = { ...ex, actualReps: reps ?? undefined };
            if (
              next.completed &&
              !next.skipped &&
              next.actualReps == null &&
              next.actualDuration == null
            ) {
              next = ensureExerciseMetrics(next);
            }
            return next;
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
            let next: ExerciseLog = {
              ...ex,
              actualDuration: seconds ?? undefined,
            };
            if (
              next.completed &&
              !next.skipped &&
              next.actualReps == null &&
              next.actualDuration == null
            ) {
              next = ensureExerciseMetrics(next);
            }
            return next;
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

  setWorkoutNotes: (notes) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      return { activeWorkout: { ...state.activeWorkout, notes } };
    }),

  completeWorkout: async () => {
    const state = get();
    if (!state.activeWorkout) return null;

    const completed = hydrateWorkoutLog({
      ...state.activeWorkout,
      endTime: new Date().toISOString(),
    });

    // Optimistic UI: update store first so the user gets immediate feedback.
    set((s) => ({
      activeWorkout: null,
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

  discardWorkout: () => set({ activeWorkout: null }),

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

  loadHistory: async () => {
    const mode = useAuthStore.getState().mode;
    if (mode === "loading") return; // Wait until AuthInitializer settles.
    const history = await getWorkoutRepo(mode).loadHistory();
    set({ workoutHistory: history.map(hydrateWorkoutLog) });
  },
}));
