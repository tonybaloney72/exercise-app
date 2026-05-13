import type { UserSettings, WorkoutLog } from "@/types";
import type { SettingsRepo, WorkoutRepo } from "./types";
import { DEFAULT_SETTINGS } from "./types";

export const LOCAL_HISTORY_KEY = "exercise-app-history";
export const LOCAL_SETTINGS_KEY = "exercise-app-settings";

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

export function clearLocalData(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(LOCAL_HISTORY_KEY);
  localStorage.removeItem(LOCAL_SETTINGS_KEY);
}
