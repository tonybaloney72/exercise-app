import type {
  UserSettings,
  WorkoutLog,
  ExerciseSettingsValues,
  ExercisePreferenceKind,
  DayPlan,
} from "@/types";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";

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

/** exerciseId → preference. Omitted keys are neutral. */
export type ExercisePreferenceMap = Record<string, ExercisePreferenceKind>;

export interface ExercisePreferenceRepo {
  loadAll(): Promise<ExercisePreferenceMap>;
  /** `null` removes the row (neutral). */
  setPreference(
    exerciseId: string,
    preference: ExercisePreferenceKind | null,
  ): Promise<void>;
}

/** dayOfWeek 0 (Sun) … 6 (Sat) → persisted template for that day. */
export type TrainingWeekDays = Record<number, DayPlan>;

export interface TrainingWeekRepo {
  loadWeek(weekStartSundayKey: string): Promise<TrainingWeekDays | null>;
  saveSeededWeek(weekStartSundayKey: string, days: TrainingWeekDays): Promise<void>;
}

export const DEFAULT_SETTINGS: UserSettings = {
  restBetweenRounds: 90,
  darkMode: true,
  timerSoundsEnabled: true,
  timerVibrationEnabled: true,
  keepScreenAwake: false,
  availableEquipment: [...DEFAULT_AVAILABLE_EQUIPMENT],
};
