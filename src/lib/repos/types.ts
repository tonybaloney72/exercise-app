import type {
  UserSettings,
  WorkoutLog,
  ExerciseSettingsValues,
} from "@/types";

export type ExerciseSettingsMap = Record<string, ExerciseSettingsValues>;

export interface WorkoutRepo {
  loadHistory(): Promise<WorkoutLog[]>;
  saveWorkout(log: WorkoutLog): Promise<void>;
  deleteWorkout(id: string): Promise<void>;
}

export interface SettingsRepo {
  load(): Promise<UserSettings>;
  save(settings: UserSettings): Promise<void>;
}

export interface ExerciseSettingsRepo {
  loadAll(): Promise<ExerciseSettingsMap>;
  upsert(exerciseId: string, values: ExerciseSettingsValues): Promise<void>;
}

export const DEFAULT_SETTINGS: UserSettings = {
  restBetweenRounds: 90,
  darkMode: true,
};
