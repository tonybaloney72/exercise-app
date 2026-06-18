import type { AuthMode } from "@/core";
import { repoAuthMode } from "@/core";
import {
  localExercisePreferenceRepo,
  localExerciseSettingsRepo,
  localSettingsRepo,
  localWorkoutRepo,
  localTrainingWeekRepo,
  localWorkoutDayTemplateRepo,
} from "./local";
import { localWeightEntryRepo } from "./weightLocal";
import { localDailyHealthMetricRepo } from "./healthDailyLocal";
import {
  supabaseExercisePreferenceRepo,
  supabaseExerciseSettingsRepo,
  supabaseSettingsRepo,
  supabaseWorkoutRepo,
  supabaseTrainingWeekRepo,
  supabaseWorkoutDayTemplateRepo,
  supabaseUserFeedbackRepo,
  supabaseWeightEntryRepo,
  supabaseDailyHealthMetricRepo,
} from "./supabase";
import type {
  ExercisePreferenceRepo,
  ExerciseSettingsRepo,
  SettingsRepo,
  WorkoutRepo,
  TrainingWeekRepo,
  WorkoutDayTemplateRepo,
  UserFeedbackRepo,
  WeightEntryRepo,
  DailyHealthMetricRepo,
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
  WeightEntryRepo,
  DailyHealthMetricRepo,
} from "./types";
export { DEFAULT_SETTINGS } from "./types";

function isSupabaseMode(mode: AuthMode): boolean {
  return repoAuthMode(mode) === "authenticated";
}

export function getWorkoutRepo(mode: AuthMode): WorkoutRepo {
  return isSupabaseMode(mode) ? supabaseWorkoutRepo : localWorkoutRepo;
}

export function getSettingsRepo(mode: AuthMode): SettingsRepo {
  return isSupabaseMode(mode) ? supabaseSettingsRepo : localSettingsRepo;
}

export function getExerciseSettingsRepo(mode: AuthMode): ExerciseSettingsRepo {
  return isSupabaseMode(mode)
    ? supabaseExerciseSettingsRepo
    : localExerciseSettingsRepo;
}

export function getExercisePreferenceRepo(
  mode: AuthMode,
): ExercisePreferenceRepo {
  return isSupabaseMode(mode)
    ? supabaseExercisePreferenceRepo
    : localExercisePreferenceRepo;
}

export function getTrainingWeekRepo(mode: AuthMode): TrainingWeekRepo {
  return isSupabaseMode(mode)
    ? supabaseTrainingWeekRepo
    : localTrainingWeekRepo;
}

export function getWorkoutDayTemplateRepo(
  mode: AuthMode,
): WorkoutDayTemplateRepo {
  return isSupabaseMode(mode)
    ? supabaseWorkoutDayTemplateRepo
    : localWorkoutDayTemplateRepo;
}

/** Always Supabase - guests may submit exercise reports (anon insert). */
export function getUserFeedbackRepo(): UserFeedbackRepo {
  return supabaseUserFeedbackRepo;
}

export function getWeightEntryRepo(mode: AuthMode): WeightEntryRepo {
  return isSupabaseMode(mode) ? supabaseWeightEntryRepo : localWeightEntryRepo;
}

export function getDailyHealthMetricRepo(mode: AuthMode): DailyHealthMetricRepo {
  return isSupabaseMode(mode)
    ? supabaseDailyHealthMetricRepo
    : localDailyHealthMetricRepo;
}
