"use client";

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { WorkoutLog, RoundLog, ExerciseLog, DayPlan } from "@/types";
import { DEFAULT_WARM_UP, DEFAULT_COOL_DOWN } from "@/data/stretches";

interface WorkoutState {
  activeWorkout: WorkoutLog | null;
  workoutHistory: WorkoutLog[];
  startWorkout: (plan: DayPlan) => void;
  toggleJog: () => void;
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
  completeWorkout: () => WorkoutLog | null;
  discardWorkout: () => void;

  loadHistory: () => void;
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

function loadHistoryFromStorage(): WorkoutLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("exercise-app-history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistoryToStorage(history: WorkoutLog[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("exercise-app-history", JSON.stringify(history));
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
        date: now.toISOString().split("T")[0],
        dayOfWeek: now.getDay(),
        jogCompleted: false,
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
        },
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

  completeWorkout: () => {
    const state = get();
    if (!state.activeWorkout) return null;

    const completed: WorkoutLog = {
      ...state.activeWorkout,
      endTime: new Date().toISOString(),
    };

    const newHistory = [completed, ...state.workoutHistory];
    saveHistoryToStorage(newHistory);

    set({ activeWorkout: null, workoutHistory: newHistory });
    return completed;
  },

  discardWorkout: () => set({ activeWorkout: null }),

  loadHistory: () => {
    set({ workoutHistory: loadHistoryFromStorage() });
  },
}));
