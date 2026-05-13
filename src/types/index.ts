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
  actualDuration?: number;
  skipped: boolean;
  swappedWith?: string;
  notes?: string;
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
