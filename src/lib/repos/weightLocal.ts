import type { WeightLogEntry } from "@/types";
import { sanitizeWeightLog, upsertWeightEntry } from "@/lib/weightLog";
import { LOCAL_SETTINGS_KEY, LOCAL_WEIGHT_ENTRIES_KEY } from "@/lib/repos/local";
import type { WeightEntryRepo } from "./types";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readLegacyWeightFromSettings(): WeightLogEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { weightLog?: unknown };
    return sanitizeWeightLog(parsed.weightLog);
  } catch {
    return [];
  }
}

function loadStoredEntries(): WeightLogEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(LOCAL_WEIGHT_ENTRIES_KEY);
    if (raw) {
      return sanitizeWeightLog(JSON.parse(raw));
    }
  } catch {
    // fall through to legacy migration
  }

  const legacy = readLegacyWeightFromSettings();
  if (legacy.length > 0) {
    persistEntries(legacy);
  }
  return legacy;
}

function persistEntries(entries: WeightLogEntry[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(LOCAL_WEIGHT_ENTRIES_KEY, JSON.stringify(entries));
}

export const localWeightEntryRepo: WeightEntryRepo = {
  async list(): Promise<WeightLogEntry[]> {
    return loadStoredEntries();
  },

  async upsert(dateKey: string, weightLb: number): Promise<void> {
    const next = upsertWeightEntry(loadStoredEntries(), dateKey, weightLb);
    persistEntries(next);
  },
};
