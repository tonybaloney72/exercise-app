import type {
  UserSettings,
  WorkoutLog,
  ExerciseSettingsValues,
} from "@/types";
import { v4 as uuidv4 } from "uuid";
import {
  MAX_WORKOUT_DAY_TEMPLATES,
  sanitizeTemplateSnapshot,
} from "@/lib/workoutDayTemplates";
import type { WorkoutDayTemplate } from "@/types";
import type {
  ExerciseSettingsMap,
  ExerciseSettingsRepo,
  ExercisePreferenceRepo,
  ExercisePreferenceMap,
  SettingsRepo,
  WorkoutRepo,
  TrainingWeekRepo,
  WorkoutDayTemplateRepo,
  SaveWorkoutDayTemplateInput,
} from "./types";
import { migrateExerciseId, migrateWorkoutLog } from "@/lib/cpToPcMigration";
import { clientTraceAsync } from "@/lib/diagnostics/clientTrace";
import { normalizeUserSettings } from "@/lib/normalizeUserSettings";
import { LOCAL_HEALTH_DAILY_METRICS_KEY } from "@/lib/repos/healthDailyLocal";
import { DEFAULT_SETTINGS } from "./types";

const LOCAL_HISTORY_KEY = "exercise-app-history";
export const LOCAL_SETTINGS_KEY = "exercise-app-settings";
export const LOCAL_WEIGHT_ENTRIES_KEY = "exercise-app-weight-entries";
const LOCAL_EXERCISE_SETTINGS_KEY = "exercise-app-exercise-settings";
const LOCAL_WORKOUT_TEMPLATES_KEY = "exercise-app-workout-day-templates";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const localWorkoutRepo: WorkoutRepo = {
  async loadHistory(): Promise<WorkoutLog[]> {
    if (!isBrowser()) return [];
    try {
      const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as WorkoutLog[];
      return parsed.map(migrateWorkoutLog);
    } catch {
      return [];
    }
  },

  async saveWorkout(log: WorkoutLog): Promise<void> {
    await clientTraceAsync(
      "workout-repo",
      "local_saveWorkout",
      async () => {
        if (!isBrowser()) return;
        const current = await localWorkoutRepo.loadHistory();
        const without = current.filter((w) => w.id !== log.id);
        const next = [log, ...without];
        localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(next));
      },
      { workoutId: log.id, date: log.date },
    );
  },

  async deleteWorkout(id: string): Promise<void> {
    if (!isBrowser()) return;
    const current = await this.loadHistory();
    const next = current.filter((w) => w.id !== id);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(next));
  },
};

export const localSettingsRepo: SettingsRepo = {
  async load(): Promise<UserSettings> {
    if (!isBrowser()) return DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
      return raw
        ? normalizeUserSettings(JSON.parse(raw) as Partial<UserSettings>)
        : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async save(settings: UserSettings): Promise<void> {
    if (!isBrowser()) return;
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  },
};

function sanitizeExerciseSettingsMap(raw: unknown): ExerciseSettingsMap {
  if (!raw || typeof raw !== "object") return {};
  const out: ExerciseSettingsMap = {};
  for (const [exerciseId, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    if (o.defaultSetMode !== "reps" && o.defaultSetMode !== "timer") continue;
    const ts = o.defaultTimerSeconds;
    const tr = o.defaultTargetReps;
    out[exerciseId] = {
      defaultSetMode: o.defaultSetMode,
      defaultTimerSeconds:
        typeof ts === "number" && ts > 0 ? ts : ts === null ? null : undefined,
      defaultTargetReps:
        typeof tr === "number" && tr > 0 ? tr : tr === null ? null : undefined,
    };
  }
  return out;
}

function migrateSettingsMapKeys(map: ExerciseSettingsMap): ExerciseSettingsMap {
  const out: ExerciseSettingsMap = {};
  for (const [id, values] of Object.entries(map)) {
    out[migrateExerciseId(id)] = values;
  }
  return out;
}

export const localExerciseSettingsRepo: ExerciseSettingsRepo = {
  async loadAll(): Promise<ExerciseSettingsMap> {
    if (!isBrowser()) return {};
    try {
      const raw = localStorage.getItem(LOCAL_EXERCISE_SETTINGS_KEY);
      return raw
        ? migrateSettingsMapKeys(sanitizeExerciseSettingsMap(JSON.parse(raw)))
        : {};
    } catch {
      return {};
    }
  },

  async upsert(exerciseId: string, values: ExerciseSettingsValues): Promise<void> {
    if (!isBrowser()) return;
    const current = await this.loadAll();
    const next: ExerciseSettingsMap = { ...current, [exerciseId]: values };
    localStorage.setItem(
      LOCAL_EXERCISE_SETTINGS_KEY,
      JSON.stringify(next),
    );
  },
};

export const localExercisePreferenceRepo: ExercisePreferenceRepo = {
  async loadAll(): Promise<ExercisePreferenceMap> {
    return {};
  },

  async setPreference(): Promise<void> {
    /* Guest / local: preferences are server-only for signed-in users (Slice 1). */
  },
};

/** Guest: weeks are not stored locally; `planResolver` materializes on each read. */
export const localTrainingWeekRepo: TrainingWeekRepo = {
  async loadWeek() {
    return null;
  },
  async saveSeededWeek(_weekKey, _days, _options) {
    /* no-op */
  },
};

function loadLocalTemplates(): WorkoutDayTemplate[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(LOCAL_WORKOUT_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: WorkoutDayTemplate[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const name = typeof r.name === "string" ? r.name.trim() : "";
      const id = typeof r.id === "string" ? r.id : "";
      const plan = sanitizeTemplateSnapshot(r.plan);
      if (!name || !id || !plan) continue;
      out.push({
        id,
        name,
        plan,
        createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
        updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function persistLocalTemplates(templates: WorkoutDayTemplate[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(LOCAL_WORKOUT_TEMPLATES_KEY, JSON.stringify(templates));
}

export const localWorkoutDayTemplateRepo: WorkoutDayTemplateRepo = {
  async listAll() {
    return loadLocalTemplates();
  },

  async save(input: SaveWorkoutDayTemplateInput) {
    const templates = loadLocalTemplates();
    const now = new Date().toISOString();
    if (input.id) {
      const index = templates.findIndex((t) => t.id === input.id);
      if (index < 0) {
        throw new Error("Template not found");
      }
      const next = {
        ...templates[index],
        name: input.name,
        plan: input.plan,
        updatedAt: now,
      };
      templates[index] = next;
      persistLocalTemplates(templates);
      return next;
    }
    if (templates.length >= MAX_WORKOUT_DAY_TEMPLATES) {
      throw new Error("Template limit reached");
    }
    const created: WorkoutDayTemplate = {
      id: uuidv4(),
      name: input.name,
      plan: input.plan,
      createdAt: now,
      updatedAt: now,
    };
    persistLocalTemplates([created, ...templates]);
    return created;
  },

  async delete(id: string) {
    const templates = loadLocalTemplates().filter((t) => t.id !== id);
    persistLocalTemplates(templates);
  },
};

export function clearLocalData(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(LOCAL_HISTORY_KEY);
  localStorage.removeItem(LOCAL_SETTINGS_KEY);
  localStorage.removeItem(LOCAL_EXERCISE_SETTINGS_KEY);
  localStorage.removeItem(LOCAL_WORKOUT_TEMPLATES_KEY);
  localStorage.removeItem(LOCAL_WEIGHT_ENTRIES_KEY);
  localStorage.removeItem(LOCAL_HEALTH_DAILY_METRICS_KEY);
}
