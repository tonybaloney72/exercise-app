import type { AuthMode } from "@/stores/useAuthStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  localExercisePreferenceRepo,
  localExerciseSettingsRepo,
  localSettingsRepo,
  localWorkoutRepo,
  localTrainingWeekRepo,
  localWorkoutDayTemplateRepo,
} from "./local";
import {
  supabaseExercisePreferenceRepo,
  supabaseExerciseSettingsRepo,
  supabaseSettingsRepo,
  supabaseWorkoutRepo,
  supabaseTrainingWeekRepo,
  supabaseWorkoutDayTemplateRepo,
} from "./supabase";
import type {
  ExercisePreferenceRepo,
  ExerciseSettingsRepo,
  SettingsRepo,
  WorkoutRepo,
  TrainingWeekRepo,
  WorkoutDayTemplateRepo,
} from "./types";

export type {
  ExercisePreferenceMap,
  ExercisePreferenceRepo,
  ExerciseSettingsMap,
  ExerciseSettingsRepo,
  SettingsRepo,
  WorkoutRepo,
  TrainingWeekDays,
  TrainingWeekRepo,
  WorkoutDayTemplateRepo,
} from "./types";
export { DEFAULT_SETTINGS } from "./types";

export function getWorkoutRepo(mode?: AuthMode): WorkoutRepo {
  const m = mode ?? useAuthStore.getState().mode;
  return m === "authenticated" ? supabaseWorkoutRepo : localWorkoutRepo;
}

export function getSettingsRepo(mode?: AuthMode): SettingsRepo {
  const m = mode ?? useAuthStore.getState().mode;
  return m === "authenticated" ? supabaseSettingsRepo : localSettingsRepo;
}

export function getExerciseSettingsRepo(mode?: AuthMode): ExerciseSettingsRepo {
  const m = mode ?? useAuthStore.getState().mode;
  return m === "authenticated"
    ? supabaseExerciseSettingsRepo
    : localExerciseSettingsRepo;
}

export function getExercisePreferenceRepo(mode?: AuthMode): ExercisePreferenceRepo {
  const m = mode ?? useAuthStore.getState().mode;
  return m === "authenticated"
    ? supabaseExercisePreferenceRepo
    : localExercisePreferenceRepo;
}

export function getTrainingWeekRepo(mode?: AuthMode): TrainingWeekRepo {
  const m = mode ?? useAuthStore.getState().mode;
  return m === "authenticated" ? supabaseTrainingWeekRepo : localTrainingWeekRepo;
}

export function getWorkoutDayTemplateRepo(
  mode?: AuthMode,
): WorkoutDayTemplateRepo {
  const m = mode ?? useAuthStore.getState().mode;
  return m === "authenticated"
    ? supabaseWorkoutDayTemplateRepo
    : localWorkoutDayTemplateRepo;
}
