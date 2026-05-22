import type {
  DayPlan,
  ExerciseLog,
  ExerciseEquipment,
  ExerciseSettingsValues,
  ExerciseSetMode,
  RoundDensity,
  RoundLog,
  UserSettings,
  WorkoutLog,
} from "@/types";
import { createClient } from "@/lib/supabase/client";
import { sanitizeStretchEntries } from "@/lib/stretchDefaults";
import { sanitizeExpertiseByGroup } from "@/lib/expertiseLevels";
import { normalizeUserSettings } from "@/lib/normalizeUserSettings";
import {
  sanitizeTrainingPriorityPreset,
  sanitizeTrainingPriorityScores,
} from "@/lib/trainingPriorities";
import {
  sanitizeProgramMode,
  sanitizeWeeklyCategoryLayout,
} from "@/lib/weeklyCategoryLayout";
import { DEFAULT_TIMER_SECONDS_FALLBACK } from "@/utils/effectiveExerciseSettings";
import type {
  ExerciseSettingsMap,
  ExerciseSettingsRepo,
  ExercisePreferenceMap,
  ExercisePreferenceRepo,
  SettingsRepo,
  WorkoutRepo,
  TrainingWeekDays,
  TrainingWeekRepo,
  PersistedTrainingWeek,
  SaveTrainingWeekOptions,
  WorkoutDayTemplateRepo,
  SaveWorkoutDayTemplateInput,
} from "./types";
import type { WorkoutDayTemplate } from "@/types";
import {
  MAX_WORKOUT_DAY_TEMPLATES,
  sanitizeTemplateSnapshot,
} from "@/lib/workoutDayTemplates";
import { DEFAULT_SETTINGS } from "./types";
import {
  ALL_EXERCISE_EQUIPMENT,
  DEFAULT_AVAILABLE_EQUIPMENT,
} from "@/data/equipment";
import { sanitizeWeeklyCardioByDay } from "@/lib/cardioActivities";
import {
  migrateExerciseId,
  migrateTrainingWeekDays,
  migrateWorkoutLog,
} from "@/lib/cpToPcMigration";
import { sanitizeWeeklyRestDays } from "@/lib/restDays";
import { ensureCardioExercises } from "@/lib/resolveWorkoutCardio";
import {
  hydrateCardioFromNotes,
  userFacingWorkoutNotes,
  workoutLogForPersistence,
} from "@/lib/workoutCardioPersistence";

type Section = "warm_up" | "round" | "cool_down" | "cardio";

interface WorkoutRow {
  id: string;
  user_id: string;
  date: string;
  day_of_week: number;
  warm_up_completed: boolean;
  cool_down_completed: boolean;
  notes: string | null;
  start_time: string | null;
  end_time: string | null;
  paused?: boolean;
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
  actual_distance_mi: number | null;
  target_duration_seconds: number | null;
  skipped: boolean;
  swapped_with: string | null;
  notes: string | null;
}

interface SettingsRow {
  user_id: string;
  rest_between_rounds: number;
  week_start_date: string | null;
  dark_mode: boolean;
  timer_sounds_enabled?: boolean;
  timer_vibration_enabled?: boolean;
  keep_screen_awake?: boolean;
  rest_timer_auto_start?: boolean;
  available_equipment?: unknown;
  program_focus?: string;
  training_priority_customized?: boolean;
  training_priority_scores?: unknown;
  program_mode?: string;
  weekly_category_layout?: unknown;
  weekly_category_layout_customized?: boolean;
  round_density?: string;
  default_warm_up?: unknown;
  default_cool_down?: unknown;
  weekly_rest_days?: unknown;
  weekly_rest_days_customized?: boolean;
  weekly_cardio_by_day?: unknown;
  weekly_cardio_customized?: boolean;
  equipment_onboarding_completed?: boolean;
  expertise_by_group?: unknown;
  expertise_by_group_customized?: boolean;
}

function rowToExerciseLog(r: ExerciseRow): ExerciseLog {
  return {
    exerciseId: migrateExerciseId(r.exercise_id),
    completed: r.completed,
    actualReps: r.actual_reps ?? undefined,
    actualDuration: r.actual_duration ?? undefined,
    actualDistanceMi: r.actual_distance_mi ?? undefined,
    targetDurationSeconds: r.target_duration_seconds ?? undefined,
    skipped: r.skipped,
    swappedWith: r.swapped_with
      ? migrateExerciseId(r.swapped_with)
      : undefined,
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
  const cardio = exerciseLogs
    .filter((r) => r.section === "cardio")
    .sort((a, b) => a.position - b.position)
    .map(rowToExerciseLog);

  const log: WorkoutLog = {
    id: row.id,
    date: row.date,
    dayOfWeek: row.day_of_week,
    warmUpCompleted: row.warm_up_completed,
    warmUpExercises: warmUp,
    coolDownCompleted: row.cool_down_completed,
    coolDownExercises: coolDown,
    cardioExercises: cardio.length > 0 ? cardio : undefined,
    rounds,
    notes: userFacingWorkoutNotes(row.notes ?? undefined),
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    paused: row.paused ?? false,
  };
  return hydrateCardioFromNotes(log);
}

/**
 * Flatten a WorkoutLog into the {workout, exerciseLogs[]} payload the
 * `save_workout` RPC expects. The RPC handles the user_id and ids itself.
 */
function workoutToSavePayload(log: WorkoutLog) {
  const persisted = workoutLogForPersistence(log);
  const workout = {
    id: persisted.id,
    date: persisted.date,
    day_of_week: persisted.dayOfWeek,
    warm_up_completed: persisted.warmUpCompleted,
    cool_down_completed: persisted.coolDownCompleted,
    notes: persisted.notes ?? null,
    start_time: persisted.startTime ?? null,
    end_time: persisted.endTime ?? null,
    paused: persisted.paused ?? false,
  };

  const exerciseLogs: Array<{
    section: Section;
    round_number: number | null;
    position: number;
    exercise_id: string;
    completed: boolean;
    actual_reps: number | null;
    actual_duration: number | null;
    actual_distance_mi: number | null;
    target_duration_seconds: number | null;
    skipped: boolean;
    swapped_with: string | null;
    notes: string | null;
  }> = [];

  persisted.warmUpExercises.forEach((ex, i) =>
    exerciseLogs.push({
      section: "warm_up",
      round_number: null,
      position: i,
      exercise_id: ex.exerciseId,
      completed: ex.completed,
      actual_reps: ex.actualReps ?? null,
      actual_duration: ex.actualDuration ?? null,
      actual_distance_mi: ex.actualDistanceMi ?? null,
      target_duration_seconds: ex.targetDurationSeconds ?? null,
      skipped: ex.skipped,
      swapped_with: ex.swappedWith ?? null,
      notes: ex.notes ?? null,
    }),
  );

  persisted.rounds.forEach((round) =>
    round.exercises.forEach((ex, i) =>
      exerciseLogs.push({
        section: "round",
        round_number: round.roundNumber,
        position: i,
        exercise_id: ex.exerciseId,
        completed: ex.completed,
        actual_reps: ex.actualReps ?? null,
        actual_duration: ex.actualDuration ?? null,
        actual_distance_mi: ex.actualDistanceMi ?? null,
        target_duration_seconds: ex.targetDurationSeconds ?? null,
        skipped: ex.skipped,
        swapped_with: ex.swappedWith ?? null,
        notes: ex.notes ?? null,
      }),
    ),
  );

  persisted.coolDownExercises.forEach((ex, i) =>
    exerciseLogs.push({
      section: "cool_down",
      round_number: null,
      position: i,
      exercise_id: ex.exerciseId,
      completed: ex.completed,
      actual_reps: ex.actualReps ?? null,
      actual_duration: ex.actualDuration ?? null,
      actual_distance_mi: ex.actualDistanceMi ?? null,
      target_duration_seconds: ex.targetDurationSeconds ?? null,
      skipped: ex.skipped,
      swapped_with: ex.swappedWith ?? null,
      notes: ex.notes ?? null,
    }),
  );

  ensureCardioExercises(persisted).forEach((ex, i) =>
    exerciseLogs.push({
      section: "cardio",
      round_number: null,
      position: i,
      exercise_id: ex.exerciseId,
      completed: ex.completed,
      actual_reps: ex.actualReps ?? null,
      actual_duration: ex.actualDuration ?? null,
      actual_distance_mi: ex.actualDistanceMi ?? null,
      target_duration_seconds: ex.targetDurationSeconds ?? null,
      skipped: ex.skipped,
      swapped_with: ex.swappedWith ?? null,
      notes: ex.notes ?? null,
    }),
  );

  return { workout, exerciseLogs };
}

function sanitizeRoundDensity(raw: unknown): RoundDensity {
  if (raw === "compact" || raw === "full" || raw === "standard") {
    return raw;
  }
  return "standard";
}

function sanitizeAvailableEquipment(raw: unknown): ExerciseEquipment[] {
  if (!Array.isArray(raw)) return [...DEFAULT_AVAILABLE_EQUIPMENT];
  const allowed = new Set(ALL_EXERCISE_EQUIPMENT);
  const out = raw.filter(
    (x): x is ExerciseEquipment =>
      typeof x === "string" && allowed.has(x as ExerciseEquipment),
  );
  return out.length > 0 ? out : [...DEFAULT_AVAILABLE_EQUIPMENT];
}

function rowToSettings(row: SettingsRow): UserSettings {
  return normalizeUserSettings({
    restBetweenRounds: row.rest_between_rounds,
    weekStartDate: row.week_start_date ?? undefined,
    darkMode: row.dark_mode,
    restTimerAutoStart: row.rest_timer_auto_start ?? true,
    timerSoundsEnabled: row.timer_sounds_enabled ?? true,
    timerVibrationEnabled: row.timer_vibration_enabled ?? true,
    keepScreenAwake: row.keep_screen_awake ?? false,
    availableEquipment: sanitizeAvailableEquipment(row.available_equipment),
    trainingPriorityPreset: sanitizeTrainingPriorityPreset(row.program_focus),
    trainingPriorityCustomized: row.training_priority_customized ?? false,
    trainingPriorityScores: sanitizeTrainingPriorityScores(
      row.training_priority_scores,
    ),
    programMode: sanitizeProgramMode(row.program_mode),
    weeklyCategoryLayout: sanitizeWeeklyCategoryLayout(
      row.weekly_category_layout,
    ),
    weeklyCategoryLayoutCustomized:
      row.weekly_category_layout_customized ?? false,
    roundDensity: sanitizeRoundDensity(row.round_density),
    defaultWarmUp: sanitizeStretchEntries(row.default_warm_up),
    defaultCoolDown: sanitizeStretchEntries(row.default_cool_down),
    weeklyRestDays: sanitizeWeeklyRestDays(row.weekly_rest_days),
    weeklyRestDaysCustomized: row.weekly_rest_days_customized ?? false,
    weeklyCardioByDay: sanitizeWeeklyCardioByDay(row.weekly_cardio_by_day),
    weeklyCardioCustomized: row.weekly_cardio_customized ?? false,
    equipmentOnboardingCompleted: row.equipment_onboarding_completed ?? false,
    expertiseByGroup: sanitizeExpertiseByGroup(row.expertise_by_group),
  });
}

function settingsToRow(s: UserSettings, userId: string): SettingsRow {
  return {
    user_id: userId,
    rest_between_rounds: s.restBetweenRounds,
    week_start_date: s.weekStartDate ?? null,
    dark_mode: s.darkMode,
    rest_timer_auto_start: s.restTimerAutoStart,
    timer_sounds_enabled: s.timerSoundsEnabled,
    timer_vibration_enabled: s.timerVibrationEnabled,
    keep_screen_awake: s.keepScreenAwake,
    available_equipment: s.availableEquipment,
    program_focus: s.trainingPriorityPreset,
    training_priority_customized: s.trainingPriorityCustomized,
    training_priority_scores: s.trainingPriorityScores,
    program_mode: s.programMode,
    weekly_category_layout: s.weeklyCategoryLayout,
    weekly_category_layout_customized: s.weeklyCategoryLayoutCustomized,
    round_density: s.roundDensity,
    default_warm_up: s.defaultWarmUp,
    default_cool_down: s.defaultCoolDown,
    weekly_rest_days: s.weeklyRestDays,
    weekly_rest_days_customized: s.weeklyRestDaysCustomized,
    weekly_cardio_by_day: s.weeklyCardioByDay,
    weekly_cardio_customized: s.weeklyCardioCustomized,
    equipment_onboarding_completed: s.equipmentOnboardingCompleted,
    expertise_by_group: s.expertiseByGroup,
    expertise_by_group_customized: true,
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
    return (data as WorkoutRow[]).map((row) => migrateWorkoutLog(rowToWorkout(row)));
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

interface ExerciseSettingsRow {
  exercise_id: string;
  default_set_mode: string;
  default_timer_seconds: number | null;
  default_target_reps: number | null;
}

function rowToExerciseSettingsValues(
  row: ExerciseSettingsRow,
): ExerciseSettingsValues | null {
  if (row.default_set_mode !== "reps" && row.default_set_mode !== "timer") {
    return null;
  }
  return {
    defaultSetMode: row.default_set_mode as ExerciseSetMode,
    defaultTimerSeconds: row.default_timer_seconds ?? undefined,
    defaultTargetReps: row.default_target_reps ?? undefined,
  };
}

export const supabaseExerciseSettingsRepo: ExerciseSettingsRepo = {
  async loadAll(): Promise<ExerciseSettingsMap> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from("exercise_settings")
      .select(
        "exercise_id, default_set_mode, default_timer_seconds, default_target_reps",
      )
      .eq("user_id", user.id);

    if (error) {
      console.error("[supabaseExerciseSettingsRepo.loadAll]", error);
      return {};
    }

    const map: ExerciseSettingsMap = {};
    for (const row of data ?? []) {
      const r = row as ExerciseSettingsRow;
      const v = rowToExerciseSettingsValues(r);
      if (v) map[migrateExerciseId(r.exercise_id)] = v;
    }
    return map;
  },

  async upsert(
    exerciseId: string,
    values: ExerciseSettingsValues,
  ): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const default_timer_seconds =
      values.defaultSetMode === "timer"
        ? values.defaultTimerSeconds != null &&
            values.defaultTimerSeconds > 0
          ? values.defaultTimerSeconds
          : DEFAULT_TIMER_SECONDS_FALLBACK
        : null;

    const default_target_reps =
      values.defaultSetMode === "reps" &&
      values.defaultTargetReps != null &&
      values.defaultTargetReps > 0
        ? Math.min(999, Math.round(values.defaultTargetReps))
        : null;

    const { error } = await supabase.from("exercise_settings").upsert(
      {
        user_id: user.id,
        exercise_id: exerciseId,
        default_set_mode: values.defaultSetMode,
        default_timer_seconds,
        default_target_reps,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,exercise_id" },
    );

    if (error) {
      console.error("[supabaseExerciseSettingsRepo.upsert]", error);
      throw error;
    }
  },
};

interface ExercisePreferenceRow {
  exercise_id: string;
  preference: "favorite" | "disliked";
}

export const supabaseExercisePreferenceRepo: ExercisePreferenceRepo = {
  async loadAll(): Promise<ExercisePreferenceMap> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from("user_exercise_preferences")
      .select("exercise_id, preference")
      .eq("user_id", user.id);

    if (error) {
      console.error("[supabaseExercisePreferenceRepo.loadAll]", error);
      return {};
    }

    const map: ExercisePreferenceMap = {};
    for (const row of (data ?? []) as ExercisePreferenceRow[]) {
      if (row.preference === "favorite" || row.preference === "disliked") {
        map[migrateExerciseId(row.exercise_id)] = row.preference;
      }
    }
    return map;
  },

  async setPreference(
    exerciseId: string,
    preference: "favorite" | "disliked" | null,
  ): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    if (preference == null) {
      const { error } = await supabase
        .from("user_exercise_preferences")
        .delete()
        .eq("user_id", user.id)
        .eq("exercise_id", exerciseId);
      if (error) {
        console.error("[supabaseExercisePreferenceRepo.setPreference delete]", error);
        throw error;
      }
      return;
    }

    const { error } = await supabase.from("user_exercise_preferences").upsert(
      {
        user_id: user.id,
        exercise_id: exerciseId,
        preference,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,exercise_id" },
    );
    if (error) {
      console.error("[supabaseExercisePreferenceRepo.setPreference upsert]", error);
      throw error;
    }
  },
};

function isDayPlanShape(v: unknown): v is DayPlan {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const hasJogOk =
    typeof o.hasJog === "boolean" ||
    (Array.isArray(o.cardioActivities) && o.cardioActivities.length >= 0);
  return (
    typeof o.dayOfWeek === "number" &&
    typeof o.name === "string" &&
    typeof o.theme === "string" &&
    hasJogOk &&
    Array.isArray(o.strengthFocus) &&
    Array.isArray(o.coreGroups) &&
    Array.isArray(o.rounds)
  );
}

function daysJsonToWeek(raw: unknown): TrainingWeekDays | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    const v = obj[String(i)];
    if (!isDayPlanShape(v)) return null;
    out[i] = v;
  }
  return out;
}

export const supabaseTrainingWeekRepo: TrainingWeekRepo = {
  async loadWeek(weekStartSundayKey: string): Promise<PersistedTrainingWeek | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_training_weeks")
      .select("days, source, prefs_fingerprint")
      .eq("user_id", user.id)
      .eq("week_start_sunday", weekStartSundayKey)
      .maybeSingle();

    if (error) {
      console.error("[supabaseTrainingWeekRepo.loadWeek]", error);
      return null;
    }
    if (!data) return null;
    const row = data as {
      days: unknown;
      source: string | null;
      prefs_fingerprint: string | null;
    };
    const days = daysJsonToWeek(row.days);
    if (!days) return null;
    return {
      days: migrateTrainingWeekDays(days),
      source: row.source ?? null,
      prefsFingerprint: row.prefs_fingerprint ?? null,
    };
  },

  async saveSeededWeek(
    weekStartSundayKey: string,
    days: TrainingWeekDays,
    options?: SaveTrainingWeekOptions,
  ): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const payload = {
      user_id: user.id,
      week_start_sunday: weekStartSundayKey,
      days,
      source: options?.source ?? "daily_plans_catalog",
      prefs_fingerprint: options?.prefsFingerprint ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_training_weeks")
      .upsert(payload, { onConflict: "user_id,week_start_sunday" });

    if (error) {
      console.error("[supabaseTrainingWeekRepo.saveSeededWeek]", error);
      throw error;
    }
  },
};

export const supabaseWorkoutDayTemplateRepo: WorkoutDayTemplateRepo = {
  async listAll(): Promise<WorkoutDayTemplate[]> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("workout_day_templates")
      .select("id, name, plan, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[supabaseWorkoutDayTemplateRepo.listAll]", error);
      return [];
    }

    const out: WorkoutDayTemplate[] = [];
    for (const row of data ?? []) {
      const plan = sanitizeTemplateSnapshot(
        (row as { plan: unknown }).plan,
      );
      if (!plan) continue;
      const r = row as {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
      };
      out.push({
        id: r.id,
        name: r.name.trim(),
        plan,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      });
    }
    return out;
  },

  async save(input: SaveWorkoutDayTemplateInput): Promise<WorkoutDayTemplate> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const now = new Date().toISOString();

    if (input.id) {
      const { data, error } = await supabase
        .from("workout_day_templates")
        .update({
          name: input.name,
          plan: input.plan,
          updated_at: now,
        })
        .eq("id", input.id)
        .eq("user_id", user.id)
        .select("id, name, plan, created_at, updated_at")
        .single();

      if (error) {
        console.error("[supabaseWorkoutDayTemplateRepo.save]", error);
        throw error;
      }
      const plan = sanitizeTemplateSnapshot((data as { plan: unknown }).plan);
      if (!plan) throw new Error("Invalid template plan");
      const row = data as {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
      };
      return {
        id: row.id,
        name: row.name.trim(),
        plan,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    const { count, error: countError } = await supabase
      .from("workout_day_templates")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      console.error("[supabaseWorkoutDayTemplateRepo.save count]", countError);
      throw countError;
    }
    if ((count ?? 0) >= MAX_WORKOUT_DAY_TEMPLATES) {
      throw new Error("Template limit reached");
    }

    const { data, error } = await supabase
      .from("workout_day_templates")
      .insert({
        user_id: user.id,
        name: input.name,
        plan: input.plan,
        updated_at: now,
      })
      .select("id, name, plan, created_at, updated_at")
      .single();

    if (error) {
      console.error("[supabaseWorkoutDayTemplateRepo.save insert]", error);
      throw error;
    }
    const plan = sanitizeTemplateSnapshot((data as { plan: unknown }).plan);
    if (!plan) throw new Error("Invalid template plan");
    const row = data as {
      id: string;
      name: string;
      created_at: string;
      updated_at: string;
    };
    return {
      id: row.id,
      name: row.name.trim(),
      plan,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("workout_day_templates")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[supabaseWorkoutDayTemplateRepo.delete]", error);
      throw error;
    }
  },
};
