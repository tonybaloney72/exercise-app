export type ExerciseCategory =
  | "CF"   // Core Front/Flexion
  | "CL"   // Core Lower Abs
  | "CR"   // Core Rotational/Obliques
  | "CS"   // Core Stability
  | "UP"   // Upper Push
  | "UPL"  // Upper Pull
  | "LB"   // Lower Body
  | "PC"   // Plyometric Cardio
  | "SW"   // Stretch – Warm-Up (Dynamic)
  | "SC";  // Stretch – Cool-Down (Static)

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
  | "barbell"
  | "machine"
  | "cable"
  | "medicine_ball"
  | "plyo_box"
  | "stability_ball"
  | "pull_up_bar";

/** Planned: ExRx-style plyometric intensity (low → high). Not used in UI yet. */
export type PlyometricIntensity = "low" | "low_medium" | "medium" | "medium_high" | "high";

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
  /** When set, exercise only applies if the user has this equipment (see `availableEquipment`). */
  equipment?: ExerciseEquipment[];
  /** Hybrid Calisthenics muscle-group tags (e.g. "Lats", "Front Deltoids"). */
  muscleGroups?: string[];
  /** Reserved for catalog metadata (e.g. ExRx plyometric tier). */
  plyometricIntensity?: PlyometricIntensity;
}

/** Persisted row for `exercise_settings` (and local guest mirror). */
export interface ExerciseSettingsValues {
  defaultSetMode: ExerciseSetMode;
  /** Seconds for timer mode; omit or null when mode is reps. */
  defaultTimerSeconds?: number | null;
  /** Rep target for reps mode; omit or null when mode is timer. */
  defaultTargetReps?: number | null;
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
  /** Persisted warm-up list (custom day). When set, used as-is for workouts. */
  warmUp?: StretchEntry[];
  /** Persisted cool-down list (custom day). When set, used as-is for workouts. */
  coolDown?: StretchEntry[];
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

/** How generated weeks bias strength vs core vs conditioning (Slice 5+). */
export type ProgramFocusPreset =
  | "balanced"
  | "minimal_core"
  | "core_emphasis"
  | "strength"
  | "lower_body"
  | "upper_body"
  | "conditioning";

/** Target exercises per round when materializing from templates (Slice 5). */
export type RoundDensity = "compact" | "standard" | "full";

export interface UserSettings {
  restBetweenRounds: number;
  weekStartDate?: string;
  darkMode: boolean;
  /** Web Audio chimes when a timer completes (set/rest). */
  timerSoundsEnabled: boolean;
  /** `navigator.vibrate` when a timer completes. */
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
  programFocus: ProgramFocusPreset;
  roundDensity: RoundDensity;
  /** Always-included warm-up stretches (Settings). Merged first when deriving a day's warm-up. */
  defaultWarmUp: StretchEntry[];
  /** Always-included cool-down stretches (Settings). Merged first when deriving cool-down. */
  defaultCoolDown: StretchEntry[];
}

export interface ProgressEntry {
  date: string;
  exerciseId: string;
  reps: number;
  notes?: string;
}
