import type {
  ExerciseLog,
  RoundLog,
  UserSettings,
  WorkoutLog,
} from "@/types";
import { createClient } from "@/lib/supabase/client";
import type { SettingsRepo, WorkoutRepo } from "./types";
import { DEFAULT_SETTINGS } from "./types";

type Section = "warm_up" | "round" | "cool_down";

interface WorkoutRow {
  id: string;
  user_id: string;
  date: string;
  day_of_week: number;
  jog_completed: boolean;
  jog_distance: number | null;
  jog_duration_seconds: number | null;
  warm_up_completed: boolean;
  cool_down_completed: boolean;
  notes: string | null;
  start_time: string | null;
  end_time: string | null;
  exercise_logs?: ExerciseRow[];
}

interface ExerciseRow {
  id: string;
  workout_log_id: string;
  section: Section;
  round_number: number | null;
  position: number;
  exercise_id: string;
  completed: boolean;
  actual_reps: number | null;
  actual_duration: number | null;
  skipped: boolean;
  swapped_with: string | null;
  notes: string | null;
}

interface SettingsRow {
  user_id: string;
  rest_between_rounds: number;
  current_push_up_max: number | null;
  current_jog_distance: number | null;
  current_jog_best_time_seconds: number | null;
  week_start_date: string | null;
  dark_mode: boolean;
}

function rowToExerciseLog(r: ExerciseRow): ExerciseLog {
  return {
    exerciseId: r.exercise_id,
    completed: r.completed,
    actualReps: r.actual_reps ?? undefined,
    actualDuration: r.actual_duration ?? undefined,
    skipped: r.skipped,
    swappedWith: r.swapped_with ?? undefined,
    notes: r.notes ?? undefined,
  };
}

function rowsToRounds(rows: ExerciseRow[]): RoundLog[] {
  const grouped = new Map<number, ExerciseRow[]>();
  for (const r of rows) {
    if (r.round_number == null) continue;
    const bucket = grouped.get(r.round_number) ?? [];
    bucket.push(r);
    grouped.set(r.round_number, bucket);
  }
  const out: RoundLog[] = [];
  for (const [roundNumber, exercises] of [...grouped.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    out.push({
      roundNumber,
      exercises: exercises
        .slice()
        .sort((a, b) => a.position - b.position)
        .map(rowToExerciseLog),
    });
  }
  return out;
}

function rowToWorkout(row: WorkoutRow): WorkoutLog {
  const exerciseLogs = row.exercise_logs ?? [];
  const warmUp = exerciseLogs
    .filter((r) => r.section === "warm_up")
    .sort((a, b) => a.position - b.position)
    .map(rowToExerciseLog);
  const coolDown = exerciseLogs
    .filter((r) => r.section === "cool_down")
    .sort((a, b) => a.position - b.position)
    .map(rowToExerciseLog);
  const rounds = rowsToRounds(exerciseLogs.filter((r) => r.section === "round"));

  return {
    id: row.id,
    date: row.date,
    dayOfWeek: row.day_of_week,
    jogCompleted: row.jog_completed,
    jogDistance: row.jog_distance ?? undefined,
    jogDurationSeconds: row.jog_duration_seconds ?? undefined,
    warmUpCompleted: row.warm_up_completed,
    warmUpExercises: warmUp,
    coolDownCompleted: row.cool_down_completed,
    coolDownExercises: coolDown,
    rounds,
    notes: row.notes ?? undefined,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
  };
}

/**
 * Flatten a WorkoutLog into the {workout, exerciseLogs[]} payload the
 * `save_workout` RPC expects. The RPC handles the user_id and ids itself.
 */
function workoutToSavePayload(log: WorkoutLog) {
  const workout = {
    id: log.id,
    date: log.date,
    day_of_week: log.dayOfWeek,
    jog_completed: log.jogCompleted,
    jog_distance: log.jogDistance ?? null,
    jog_duration_seconds: log.jogDurationSeconds ?? null,
    warm_up_completed: log.warmUpCompleted,
    cool_down_completed: log.coolDownCompleted,
    notes: log.notes ?? null,
    start_time: log.startTime ?? null,
    end_time: log.endTime ?? null,
  };

  const exerciseLogs: Array<{
    section: Section;
    round_number: number | null;
    position: number;
    exercise_id: string;
    completed: boolean;
    actual_reps: number | null;
    actual_duration: number | null;
    skipped: boolean;
    swapped_with: string | null;
    notes: string | null;
  }> = [];

  log.warmUpExercises.forEach((ex, i) =>
    exerciseLogs.push({
      section: "warm_up",
      round_number: null,
      position: i,
      exercise_id: ex.exerciseId,
      completed: ex.completed,
      actual_reps: ex.actualReps ?? null,
      actual_duration: ex.actualDuration ?? null,
      skipped: ex.skipped,
      swapped_with: ex.swappedWith ?? null,
      notes: ex.notes ?? null,
    }),
  );

  log.rounds.forEach((round) =>
    round.exercises.forEach((ex, i) =>
      exerciseLogs.push({
        section: "round",
        round_number: round.roundNumber,
        position: i,
        exercise_id: ex.exerciseId,
        completed: ex.completed,
        actual_reps: ex.actualReps ?? null,
        actual_duration: ex.actualDuration ?? null,
        skipped: ex.skipped,
        swapped_with: ex.swappedWith ?? null,
        notes: ex.notes ?? null,
      }),
    ),
  );

  log.coolDownExercises.forEach((ex, i) =>
    exerciseLogs.push({
      section: "cool_down",
      round_number: null,
      position: i,
      exercise_id: ex.exerciseId,
      completed: ex.completed,
      actual_reps: ex.actualReps ?? null,
      actual_duration: ex.actualDuration ?? null,
      skipped: ex.skipped,
      swapped_with: ex.swappedWith ?? null,
      notes: ex.notes ?? null,
    }),
  );

  return { workout, exerciseLogs };
}

function rowToSettings(row: SettingsRow): UserSettings {
  return {
    restBetweenRounds: row.rest_between_rounds,
    currentPushUpMax: row.current_push_up_max ?? undefined,
    currentJogDistance: row.current_jog_distance ?? undefined,
    currentJogBestTimeSeconds: row.current_jog_best_time_seconds ?? undefined,
    weekStartDate: row.week_start_date ?? undefined,
    darkMode: row.dark_mode,
  };
}

function settingsToRow(s: UserSettings, userId: string): SettingsRow {
  return {
    user_id: userId,
    rest_between_rounds: s.restBetweenRounds,
    current_push_up_max: s.currentPushUpMax ?? null,
    current_jog_distance: s.currentJogDistance ?? null,
    current_jog_best_time_seconds: s.currentJogBestTimeSeconds ?? null,
    week_start_date: s.weekStartDate ?? null,
    dark_mode: s.darkMode,
  };
}

export const supabaseWorkoutRepo: WorkoutRepo = {
  async loadHistory(): Promise<WorkoutLog[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("workout_logs")
      .select("*, exercise_logs(*)")
      .order("date", { ascending: false });

    if (error) {
      console.error("[supabaseWorkoutRepo.loadHistory]", error);
      return [];
    }
    return (data as WorkoutRow[]).map(rowToWorkout);
  },

  async saveWorkout(log: WorkoutLog): Promise<void> {
    const supabase = createClient();
    const { workout, exerciseLogs } = workoutToSavePayload(log);
    const { error } = await supabase.rpc("save_workout", {
      p_workout_log: workout,
      p_exercise_logs: exerciseLogs,
    });
    if (error) {
      console.error("[supabaseWorkoutRepo.saveWorkout]", error);
      throw error;
    }
  },

  async deleteWorkout(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("workout_logs").delete().eq("id", id);
    if (error) {
      console.error("[supabaseWorkoutRepo.deleteWorkout]", error);
      throw error;
    }
  },
};

export const supabaseSettingsRepo: SettingsRepo = {
  async load(): Promise<UserSettings> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return DEFAULT_SETTINGS;

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[supabaseSettingsRepo.load]", error);
      return DEFAULT_SETTINGS;
    }
    if (!data) return DEFAULT_SETTINGS;
    return rowToSettings(data as SettingsRow);
  },

  async save(settings: UserSettings): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("user_settings")
      .upsert(settingsToRow(settings, user.id), { onConflict: "user_id" });
    if (error) {
      console.error("[supabaseSettingsRepo.save]", error);
      throw error;
    }
  },
};
