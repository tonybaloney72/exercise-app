import type {
  UserSettings,
  WorkoutLog,
  ExerciseSettingsValues,
} from "@/types";
import type {
  ExerciseSettingsMap,
  ExerciseSettingsRepo,
  ExercisePreferenceRepo,
  ExercisePreferenceMap,
  SettingsRepo,
  WorkoutRepo,
  TrainingWeekRepo,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

export const LOCAL_HISTORY_KEY = "exercise-app-history";
export const LOCAL_SETTINGS_KEY = "exercise-app-settings";
export const LOCAL_EXERCISE_SETTINGS_KEY = "exercise-app-exercise-settings";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const localWorkoutRepo: WorkoutRepo = {
  async loadHistory(): Promise<WorkoutLog[]> {
    if (!isBrowser()) return [];
    try {
      const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
      return raw ? (JSON.parse(raw) as WorkoutLog[]) : [];
    } catch {
      return [];
    }
  },

  async saveWorkout(log: WorkoutLog): Promise<void> {
    if (!isBrowser()) return;
    const current = await this.loadHistory();
    const without = current.filter((w) => w.id !== log.id);
    const next = [log, ...without];
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(next));
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
        ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UserSettings>) }
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

export const localExerciseSettingsRepo: ExerciseSettingsRepo = {
  async loadAll(): Promise<ExerciseSettingsMap> {
    if (!isBrowser()) return {};
    try {
      const raw = localStorage.getItem(LOCAL_EXERCISE_SETTINGS_KEY);
      return raw ? sanitizeExerciseSettingsMap(JSON.parse(raw)) : {};
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

export function clearLocalData(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(LOCAL_HISTORY_KEY);
  localStorage.removeItem(LOCAL_SETTINGS_KEY);
  localStorage.removeItem(LOCAL_EXERCISE_SETTINGS_KEY);
}
