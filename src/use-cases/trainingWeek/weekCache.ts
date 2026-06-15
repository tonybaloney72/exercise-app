import { buildTrainingWeekDepsKey } from "@/lib/trainingWeekCacheKey";
import type { TrainingWeekDays } from "@/lib/repos";
import type { AuthMode } from "@/core";
import type { DayPlan } from "@/types";
import { parseLocalDateKey, weekAnchorFromDateKey } from "@/utils/weekCalendar";

export type WeekCacheEntry = {
  anchorKey: string;
  depsKey: string;
  planRevision: number;
  weekByDow: TrainingWeekDays;
  weekSource: string | null;
};

export type TrainingWeekStoreDeps = {
  planRevision: number;
  equipmentKey: string;
  programProfileKey: string;
  stretchDefaultsKey: string;
};

/** Sun `YYYY-MM-DD` for the week containing `dateKey`, or null if invalid. */
export function normalizeWeekAnchorKey(dateKey: string): string | null {
  return weekAnchorFromDateKey(dateKey)?.weekKey ?? null;
}

export function weekCacheEntryMatches(
  entry: WeekCacheEntry | null,
  anchorKey: string,
  depsKey: string,
  planRevision: number,
): boolean {
  if (!entry || !anchorKey) return false;
  return (
    entry.anchorKey === anchorKey &&
    entry.depsKey === depsKey &&
    entry.planRevision === planRevision
  );
}

export function readWeekFromCache(
  entry: WeekCacheEntry | null,
  anchorKey: string,
  depsKey: string,
  planRevision: number,
): TrainingWeekDays | null {
  if (!entry) return null;
  if (
    entry.anchorKey !== anchorKey ||
    entry.depsKey !== depsKey ||
    entry.planRevision !== planRevision
  ) {
    return null;
  }
  return entry.weekByDow;
}

export function dayPlanFromWeekCache(
  dateKey: string,
  entry: WeekCacheEntry | null,
): DayPlan | null {
  if (!entry) return null;
  const anchor = weekAnchorFromDateKey(dateKey);
  if (!anchor || anchor.weekKey !== entry.anchorKey) return null;
  const dow = parseLocalDateKey(dateKey)?.getDay();
  if (dow == null) return null;
  return entry.weekByDow[dow] ?? null;
}

export type ApplyCustomDaySaveInput = {
  dateKey: string;
  mergedWeek: TrainingWeekDays;
  mode: AuthMode;
  weekSource?: string | null;
} & TrainingWeekStoreDeps;

export type ApplyCustomDaySavePayload = {
  anchorKey: string;
  depsKey: string;
  planRevision: number;
  weekByDow: TrainingWeekDays;
  weekSource: string | null;
};

/** Build cache-update payload after a custom day save (no store IO). */
export function buildApplyCustomDaySavePayload(
  input: ApplyCustomDaySaveInput,
): ApplyCustomDaySavePayload | null {
  const anchor = weekAnchorFromDateKey(input.dateKey);
  if (!anchor) return null;
  const depsKey = buildTrainingWeekDepsKey({
    mode: input.mode,
    equipmentKey: input.equipmentKey,
    programProfileKey: input.programProfileKey,
    stretchDefaultsKey: input.stretchDefaultsKey,
  });
  return {
    anchorKey: anchor.weekKey,
    depsKey,
    planRevision: input.planRevision,
    weekByDow: input.mergedWeek,
    weekSource: input.weekSource ?? null,
  };
}
