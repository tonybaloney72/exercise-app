export type ExerciseCategory =
  | "CF"   // Core Front/Flexion
  | "CL"   // Core Lower Abs
  | "CR"   // Core Rotational/Obliques
  | "CS"   // Core Stability
  | "UP"   // Upper Push
  | "UPL"  // Upper Pull
  | "LB"   // Lower Body
  | "CP"   // Cardio/Plyometric
  | "SW"   // Stretch – Warm-Up (Dynamic)
  | "SC";  // Stretch – Cool-Down (Static)

/** How the user prefers to log a given exercise by default (timer mode is roadmap-backed). */
export type ExerciseSetMode = "reps" | "timer";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  defaultReps: string;
  notes: string;
  source?: string;
  videoUrl?: string;
  isTimeBased: boolean;
  secondaryCategory?: ExerciseCategory;
}

/** Persisted row for `exercise_settings` (and local guest mirror). */
export interface ExerciseSettingsValues {
  defaultSetMode: ExerciseSetMode;
  /** Seconds for timer mode; omit or null when mode is reps. */
  defaultTimerSeconds?: number | null;
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

export interface DayPlan {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ...
  name: string;
  theme: string;
  hasJog: boolean;
  strengthFocus: ExerciseCategory[];
  coreGroups: ExerciseCategory[];
  rounds: Round[];
}

export interface ExerciseLog {
  exerciseId: string;
  completed: boolean;
  actualReps?: number;
  /**
   * Logged time performed (timer mode), when different from the planned countdown.
   * Optional override — if omitted when completing, we default from `targetDurationSeconds` / prescription.
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
  jogCompleted: boolean;
  jogSkipped: boolean;
  jogDistance?: number;
  jogDurationSeconds?: number; // stored as total seconds for MM:SS support
  warmUpCompleted: boolean;
  warmUpExercises: ExerciseLog[];
  coolDownCompleted: boolean;
  coolDownExercises: ExerciseLog[];
  rounds: RoundLog[];
  notes?: string;
  startTime?: string;
  endTime?: string;
}

export interface UserSettings {
  restBetweenRounds: number;
  weekStartDate?: string;
  darkMode: boolean;
}

export interface ProgressEntry {
  date: string;
  exerciseId: string;
  reps: number;
  notes?: string;
}
