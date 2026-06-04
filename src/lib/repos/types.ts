import type {
  UserSettings,
  WorkoutLog,
  ExerciseSettingsValues,
  ExercisePreferenceKind,
  DayPlan,
  WorkoutDayTemplate,
  WorkoutDayTemplateSnapshot,
} from "@/types";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { DEFAULT_EXPERTISE_BY_GROUP } from "@/lib/expertiseLevels";
import { DEFAULT_WEEKLY_PPL_SCHEDULE } from "@/lib/pplWeekSchedule";
import { scoresFromPreset } from "@/lib/trainingPriorities";
import { suggestWeeklyCardioFromCatalog } from "@/lib/cardioActivities";
import { DEFAULT_WEEKLY_REST_DAYS } from "@/lib/restDays";
import { suggestLayoutFromCatalog } from "@/lib/weeklyCategoryLayout";
import { suggestWeeklyLayoutDayStructure } from "@/lib/weeklyLayoutDayStructure";
import {
  suggestWeekBlueprintFromCatalog,
  type CustomBuildStyle,
} from "@/lib/weekBlueprint";
import {
  GUEST_FALLBACK_COOL_DOWN,
  GUEST_FALLBACK_WARM_UP,
} from "@/lib/stretchDefaults";

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

export interface PersistedTrainingWeek {
  days: TrainingWeekDays;
  source: string | null;
  prefsFingerprint: string | null;
}

export interface SaveTrainingWeekOptions {
  source?: string;
  prefsFingerprint?: string;
}

export interface TrainingWeekRepo {
  loadWeek(weekStartSundayKey: string): Promise<PersistedTrainingWeek | null>;
  saveSeededWeek(
    weekStartSundayKey: string,
    days: TrainingWeekDays,
    options?: SaveTrainingWeekOptions,
  ): Promise<void>;
}

export interface SaveWorkoutDayTemplateInput {
  id?: string;
  name: string;
  plan: WorkoutDayTemplateSnapshot;
}

export interface WorkoutDayTemplateRepo {
  listAll(): Promise<WorkoutDayTemplate[]>;
  save(input: SaveWorkoutDayTemplateInput): Promise<WorkoutDayTemplate>;
  delete(id: string): Promise<void>;
}

export const DEFAULT_SETTINGS: UserSettings = {
  restBetweenRounds: 90,
  darkMode: true,
  restTimerAutoStart: true,
  timerSoundsEnabled: true,
  timerVibrationEnabled: true,
  keepScreenAwake: false,
  availableEquipment: [...DEFAULT_AVAILABLE_EQUIPMENT],
  equipmentOnboardingCompleted: false,
  trainingPriorityPreset: "balanced",
  trainingPriorityScores: scoresFromPreset("balanced"),
  trainingPriorityCustomized: false,
  programMode: "preset",
  customBuildStyle: "manual" as CustomBuildStyle,
  weekBlueprint: suggestWeekBlueprintFromCatalog(),
  weekBlueprintCustomized: false,
  weekBuilderMigrationAcknowledged: false,
  weeklyCategoryLayout: suggestLayoutFromCatalog(),
  weeklyCategoryLayoutCustomized: false,
  weeklyLayoutDayStructure: suggestWeeklyLayoutDayStructure(
    suggestLayoutFromCatalog(),
  ),
  weeklyLayoutDayStructureCustomized: false,
  roundDensity: "standard",
  /** Signed-in users configure their own; guests get catalog fallbacks at resolve time. */
  defaultWarmUp: [],
  defaultCoolDown: [],
  weeklyRestDays: { ...DEFAULT_WEEKLY_REST_DAYS },
  weeklyRestDaysCustomized: false,
  weeklyPplSchedule: { ...DEFAULT_WEEKLY_PPL_SCHEDULE },
  weeklyPplScheduleCustomized: false,
  weeklyCardioByDay: suggestWeeklyCardioFromCatalog(),
  weeklyCardioCustomized: false,
  expertiseByGroup: { ...DEFAULT_EXPERTISE_BY_GROUP },
  weightLog: [],
};

/** Stretch defaults seeded for guest localStorage when none are stored. */
const GUEST_DEFAULT_SETTINGS: Pick<UserSettings, "defaultWarmUp" | "defaultCoolDown"> =
  {
    defaultWarmUp: [...GUEST_FALLBACK_WARM_UP],
    defaultCoolDown: [...GUEST_FALLBACK_COOL_DOWN],
  };
