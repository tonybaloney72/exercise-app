"use client";

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { WorkoutLog, RoundLog, ExerciseLog, DayPlan } from "@/types";
import { DEFAULT_WARM_UP, DEFAULT_COOL_DOWN } from "@/data/stretches";
import { getWorkoutRepo } from "@/lib/repos";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { useAuthStore } from "@/stores/useAuthStore";

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
  return plan.rounds.map((round) => ({
    roundNumber: round.roundNumber,
    exercises: round.exercises.map((ex): ExerciseLog => ({
      exerciseId: ex.exerciseId,
      completed: false,
      skipped: false,
    })),
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
    }));
    const coolDownExercises: ExerciseLog[] = DEFAULT_COOL_DOWN.map((s) => ({
      exerciseId: s.exerciseId,
      completed: false,
      skipped: false,
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
        return { ...ex, completed: !ex.completed, skipped: false };
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
        return { ...ex, completed: !ex.completed, skipped: false };
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
            return { ...ex, completed: !ex.completed, skipped: false };
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

  skipExercise: (roundNumber, exerciseId) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const rounds = state.activeWorkout.rounds.map((r) => {
        if (r.roundNumber !== roundNumber) return r;
        return {
          ...r,
          exercises: r.exercises.map((ex) => {
            if (ex.exerciseId !== exerciseId) return ex;
            return { ...ex, skipped: true, completed: false };
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
        return { ...ex, skipped: true, completed: false };
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
        return { ...ex, skipped: true, completed: false };
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

    const completed: WorkoutLog = {
      ...state.activeWorkout,
      endTime: new Date().toISOString(),
    };

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
    const updated: WorkoutLog = { ...existing, notes };
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
    set({ workoutHistory: history });
  },
}));
