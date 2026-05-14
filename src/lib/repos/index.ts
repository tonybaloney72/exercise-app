import type { AuthMode } from "@/stores/useAuthStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  localExerciseSettingsRepo,
  localSettingsRepo,
  localWorkoutRepo,
} from "./local";
import {
  supabaseExerciseSettingsRepo,
  supabaseSettingsRepo,
  supabaseWorkoutRepo,
} from "./supabase";
import type {
  ExerciseSettingsRepo,
  SettingsRepo,
  WorkoutRepo,
} from "./types";

export type {
  ExerciseSettingsMap,
  ExerciseSettingsRepo,
  SettingsRepo,
  WorkoutRepo,
} from "./types";
export { DEFAULT_SETTINGS } from "./types";
export { clearLocalData } from "./local";

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
