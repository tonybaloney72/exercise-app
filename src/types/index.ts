import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";

export type ExerciseCategory =
  | "CF" // Core Front/Flexion
  | "CL" // Core Lower Abs
  | "CR" // Core Rotational/Obliques
  | "CS" // Core Stability
  | "UP" // Upper Push
  | "UPL" // Upper Pull
  | "LB" // Lower Body
  | "PC" // Plyometric Cardio
  | "SW" // Stretch – Warm-Up (Dynamic)
  | "SC"; // Stretch – Cool-Down (Static)

/** How the user prefers to log a given exercise by default (timer mode is roadmap-backed). */
export type ExerciseSetMode = "reps" | "timer";

/**
 * Library preference for future personalized weekly plans. No stored row = neutral.
 * A given exercise has at most one row (favorite xor disliked).
 */
export type ExercisePreferenceKind = "favorite" | "disliked";

/**
 * Equipment required to perform an exercise (Hybrid Calisthenics library + future gating).
 * `bodyweight` = no gear; `rings` = gymnastic rings (listed under bodyweight on HC).
 */
export type ExerciseEquipment =
  | "bodyweight"
  | "rings"
  | "resistance_band"
  | "dumbbell"
  | "kettlebell"
  | "barbell"
  | "machine"
  | "cable"
  | "medicine_ball"
  | "bench"
  | "plyo_box"
  | "sturdy_chair"
  | "stability_ball"
  | "pull_up_bar"
  | "bicycle"
  | "indoor_bike"
  | "treadmill"
  | "elliptical"
  | "rowing_machine"
  | "stair_climber";

/** Planned: ExRx-style plyometric intensity (low → high). Not used in UI yet. */
export type PlyometricIntensity =
  | "low"
  | "low_medium"
  | "medium"
  | "medium_high"
  | "high";

/** Curated difficulty for generator filtering (see ROADMAP - Expertise levels). */
export type ExpertiseLevel =
  | "beginner"
  | "novice"
  | "intermediate"
  | "advanced"
  | "expert";

/** User skill cap per training emphasis group (mirrors training priorities). */
export type ExpertiseByGroup = Record<
  "core" | "cardio" | "lower" | "upper_push" | "upper_pull",
  ExpertiseLevel
>;

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  defaultReps: string;
  notes: string;
  source?: string;
  videoUrl?: string;
  /** Generator / swap cap vs user per-group expertise. */
  expertiseLevel?: ExpertiseLevel;
  isTimeBased: boolean;
  secondaryCategory?: ExerciseCategory;
  /** When set, exercise only applies if the user has this equipment (see `availableEquipment`). */
  equipment?: ExerciseEquipment[];
  /** Hybrid Calisthenics muscle-group tags (e.g. "Lats", "Front Deltoids"). */
  muscleGroups?: string[];
  /** Reserved for catalog metadata (e.g. ExRx plyometric tier). */
  plyometricIntensity?: PlyometricIntensity;
  /** Hybrid Calisthenics progression ladder (1 = easiest in that chain). */
  hcProgressionStep?: number;
  hcProgressionTotal?: number;
}

/** Persisted row for `exercise_settings` (and local guest mirror). */
export interface ExerciseSettingsValues {
  defaultSetMode: ExerciseSetMode;
  /** Seconds for timer mode; omit or null when mode is reps. */
  defaultTimerSeconds?: number | null;
  /** Rep target for reps mode; omit or null when mode is timer. */
  defaultTargetReps?: number | null;
  /** When true, rep-increase suggestions are suppressed for this exercise. */
  repSuggestionIgnored?: boolean;
  /** Local date key (`YYYY-MM-DD`); suggestions resume after this day. */
  repSuggestionSnoozedUntil?: string | null;
  /** Local date key when the user last accepted a rep-increase suggestion. */
  repSuggestionLastAcceptedAt?: string | null;
}

export interface CategoryMeta {
  id: ExerciseCategory;
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
}

export interface RoundExercise {
  exerciseId: string;
  targetReps: string;
  category: ExerciseCategory;
}

export interface Round {
  roundNumber: number;
  exercises: RoundExercise[];
}

export type CardioActivityKind =
  | "jog"
  | "walk"
  | "hike"
  | "cycle"
  | "treadmill"
  | "elliptical"
  | "indoor_bike"
  | "row"
  | "stairs"
  | "swim";

export interface CardioActivity {
  kind: CardioActivityKind;
  exerciseId: string;
  defaultPrescription?: string;
}

/** How a weekday is scheduled (Sun=0 … Sat=6). */
export type RestDayMode =
  | "workout"
  | "active_recovery"
  | "stretches"
  | "full_rest";

export type WeeklyRestDays = Record<number, RestDayMode>;

export type WeeklyCardioByDay = Record<number, CardioActivityKind[]>;

/** P/P/L preset: training focus or rest per weekday (0 = Sun … 6 = Sat). */
export type PplDaySchedule =
  | "push"
  | "pull"
  | "legs"
  | "active_recovery"
  | "stretches"
  | "full_rest";

export type WeeklyPplSchedule = Record<number, PplDaySchedule>;

export interface DayPlan {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ...
  name: string;
  theme: string;
  /** @deprecated Prefer {@link cardioActivities}; kept for persisted weeks + badges. */
  hasJog: boolean;
  /** Endurance block for this day (jog, walk, cycle, etc.). */
  cardioActivities?: CardioActivity[];
  /** Set when user rest settings or layout cleared strength work. */
  restDayMode?: RestDayMode;
  strengthFocus: ExerciseCategory[];
  coreGroups: ExerciseCategory[];
  rounds: Round[];
  /** Persisted warm-up list (custom day). When set, used as-is for workouts. */
  warmUp?: StretchEntry[];
  /** Persisted cool-down list (custom day). When set, used as-is for workouts. */
  coolDown?: StretchEntry[];
}

/** Portable day structure saved in workout day templates (no calendar metadata). */
export interface WorkoutDayTemplateSnapshot {
  restDayMode?: RestDayMode;
  strengthFocus: ExerciseCategory[];
  coreGroups: ExerciseCategory[];
  rounds: Round[];
  warmUp?: StretchEntry[];
  coolDown?: StretchEntry[];
  cardioActivities?: CardioActivity[];
  hasJog?: boolean;
}

export interface WorkoutDayTemplate {
  id: string;
  name: string;
  plan: WorkoutDayTemplateSnapshot;
  createdAt?: string;
  updatedAt?: string;
}

/** Cardio capture / enrichment source for {@link ExerciseLog.activitySource}. */
export type CardioActivitySource = "manual" | "gps" | "health_connect";

export interface ExerciseLog {
  exerciseId: string;
  completed: boolean;
  actualReps?: number;
  /**
   * Logged time performed (timer mode), when different from the planned countdown.
   * Optional override - if omitted when completing, we default from `targetDurationSeconds` / prescription.
   */
  actualDuration?: number;
  /**
   * Planned countdown length for this set (timer mode). From `exercise_settings` at workout start
   * or adjusted with presets / custom in the row.
   */
  targetDurationSeconds?: number;
  skipped: boolean;
  swappedWith?: string;
  notes?: string;
  /** Prescription text from the plan when the workout started (e.g. "12", "30 sec"). */
  targetPrescription?: string;
  /**
   * How this set is logged for the active workout. When omitted (e.g. loaded from
   * the server), UI falls back to `exercise_settings` + catalog `isTimeBased`.
   */
  loggingMode?: ExerciseSetMode;
  /** Miles (endurance / cardio block). */
  actualDistanceMi?: number;
  /** Steps during this cardio session (from Health Connect / phone sensors). */
  stepCount?: number;
  /** Active energy burned during this session (kilocalories). */
  activeCaloriesKcal?: number;
  /** Average heart rate during this session (watch / band when available). */
  avgHeartRateBpm?: number;
  /** How distance/time/health metrics were captured for this row. */
  activitySource?: CardioActivitySource;
  /** Health Connect recorder name (e.g. Samsung Health, Pixel). */
  healthSourceName?: string;
  /** GPS route captured during ME Start/End tracking (when available). */
  gpsTrackPoints?: GpsTrackPoint[];
  /** ME Start/End window (ISO) for HC enrich + writes; independent of workout log times. */
  activityStartTime?: string;
  activityEndTime?: string;
  /**
   * Unique row id for cardio/endurance logs (multiple walks per day, etc.).
   * When omitted, legacy rows are keyed by `exerciseId` only.
   */
  cardioInstanceId?: string;
}

export interface RoundLog {
  roundNumber: number;
  exercises: ExerciseLog[];
  restAfter?: number;
}

export interface StretchEntry {
  exerciseId: string;
  targetReps: string;
}

export interface WorkoutLog {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: number;
  /** Endurance block rows (persisted in exercise_logs with section cardio when signed in). */
  cardioExercises?: ExerciseLog[];
  warmUpCompleted: boolean;
  warmUpExercises: ExerciseLog[];
  coolDownCompleted: boolean;
  coolDownExercises: ExerciseLog[];
  rounds: RoundLog[];
  notes?: string;
  startTime?: string;
  endTime?: string;
  /** Save for later - only meaningful when `endTime` is unset (authenticated cloud sync). */
  paused?: boolean;
}

import type { TrainingPriorityScores } from "@/lib/trainingPriorities";
import type {
  ProgramMode,
  WeeklyCategoryLayout,
} from "@/lib/weeklyCategoryLayout";
import type { WeeklyLayoutDayStructure } from "@/lib/weeklyLayoutDayStructure";
import type { CustomBuildStyle, WeekBlueprint } from "@/lib/weekBlueprint";

/** Training priority preset (replaces legacy “program focus” naming in UI). */
export type TrainingPriorityPreset =
  | "balanced"
  | "minimal_core"
  | "core_emphasis"
  | "strength"
  | "lower_body"
  | "upper_body"
  | "conditioning";

/** @deprecated Use {@link TrainingPriorityPreset}. */

/** Target exercises per round when materializing from templates (Slice 5). */
export type RoundDensity = "compact" | "standard" | "full";

export interface UserSettings {
  restBetweenRounds: number;
  weekStartDate?: string;
  darkMode: boolean;
  /**
   * When true, finishing a round opens the rest countdown immediately.
   * When false, show a manual “Start rest” control on the completed round.
   */
  restTimerAutoStart: boolean;
  /** Web Audio chimes when a timer completes (set/rest). */
  timerSoundsEnabled: boolean;
  /** `navigator.vibrate` when a timer or exercise/stretch is marked complete. */
  timerVibrationEnabled: boolean;
  /**
   * Request the Screen Wake Lock API while the app tab is visible so the display
   * does not dim or lock. Uses more battery; browser may still deny the request.
   */
  keepScreenAwake: boolean;
  /**
   * Equipment the user can use when browsing the library and building routines.
   * Exercises with an `equipment` tag require at least one matching entry.
   */
  availableEquipment: ExerciseEquipment[];
  /** First-run multi-step onboarding completed or skipped via Skip setup. */
  equipmentOnboardingCompleted: boolean;
  trainingPriorityPreset: TrainingPriorityPreset;
  /** Per-group emphasis 0–4 (Skip … Peak). Drives week generation. */
  trainingPriorityScores: TrainingPriorityScores;
  /** True when scores differ from the selected preset template. */
  trainingPriorityCustomized: boolean;
  /** How automated weeks are built: PPL preset or custom (guided / manual). */
  programMode: ProgramMode;
  /** Custom mode: guided blueprint vs manual exercise picking. */
  customBuildStyle: CustomBuildStyle;
  /** Guided custom: per-day / per-round week blueprint. */
  weekBlueprint: WeekBlueprint;
  weekBlueprintCustomized: boolean;
  /** User dismissed the week-builder migration notice. */
  weekBuilderMigrationAcknowledged: boolean;
  /** @deprecated Legacy layout mode - migrated to {@link weekBlueprint}. */
  weeklyCategoryLayout: WeeklyCategoryLayout;
  /** When false, layout is derived from catalog until user edits. */
  weeklyCategoryLayoutCustomized: boolean;
  /** Per-day round structure for layout mode (blocks / repeat / mixed). */
  weeklyLayoutDayStructure: WeeklyLayoutDayStructure;
  weeklyLayoutDayStructureCustomized: boolean;
  /** @deprecated Use {@link UserSettings.trainingPriorityPreset}. */
  programFocus?: TrainingPriorityPreset;
  roundDensity: RoundDensity;
  /** Warm-up stretches generated per training day (Settings → Your Week). */
  warmUpStretchCount: number;
  /** Cool-down stretches generated per training day (Settings → Your Week). */
  coolDownStretchCount: number;
  /** @deprecated Replaced by {@link warmUpStretchCount} + per-day materialized lists. */
  defaultWarmUp: StretchEntry[];
  /** @deprecated Replaced by {@link coolDownStretchCount} + per-day materialized lists. */
  defaultCoolDown: StretchEntry[];
  /** Per weekday rest (full = no work; light = stretches only). */
  weeklyRestDays: WeeklyRestDays;
  weeklyRestDaysCustomized: boolean;
  /** P/P/L preset: push, pull, legs, active recovery, stretches, or full rest per weekday. */
  weeklyPplSchedule: WeeklyPplSchedule;
  weeklyPplScheduleCustomized: boolean;
  /** Per weekday cardio kinds (when customized). */
  weeklyCardioByDay: WeeklyCardioByDay;
  weeklyCardioCustomized: boolean;
  /** Per emphasis-group skill cap for generator / swap / library. */
  expertiseByGroup: ExpertiseByGroup;
  /** Dismissed What's New release note ids (signed-in users; synced via Supabase). */
  releaseNotesSeenIds: string[];
  /**
   * When true, offer to bump Library defaults after consistently exceeding rep/timer
   * targets (Today post-workout only).
   */
  suggestRepIncreases: boolean;
}

/** Body weight for a local calendar day (stored in pounds). */
export interface WeightLogEntry {
  date: string;
  weightLb: number;
}
