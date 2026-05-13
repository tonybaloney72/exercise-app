import type { UserSettings, WorkoutLog } from "@/types";

export interface WorkoutRepo {
  loadHistory(): Promise<WorkoutLog[]>;
  saveWorkout(log: WorkoutLog): Promise<void>;
  deleteWorkout(id: string): Promise<void>;
}

export interface SettingsRepo {
  load(): Promise<UserSettings>;
  save(settings: UserSettings): Promise<void>;
}

export const DEFAULT_SETTINGS: UserSettings = {
  restBetweenRounds: 90,
  darkMode: true,
};
