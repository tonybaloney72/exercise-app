"use client";

import { create } from "zustand";
import { TRAINING_WEEK_SOURCE_CUSTOM_V1 } from "@/lib/planGenerator";
import type { TrainingWeekDays } from "@/lib/repos";
import { buildTrainingWeekDepsKey } from "@/lib/trainingWeekCacheKey";
import type { AuthMode } from "@/stores/useAuthStore";
import type { DayPlan } from "@/types";
import { parseLocalDateKey, weekAnchorFromDateKey } from "@/utils/weekCalendar";

type WeekCacheEntry = {
  anchorKey: string;
  depsKey: string;
  planRevision: number;
  weekByDow: TrainingWeekDays;
  weekSource: string | null;
};

type EnsureWeekOptions = {
  force?: boolean;
};

type TrainingWeekState = {
  entry: WeekCacheEntry | null;
  loadingAnchorKey: string | null;
  error: string | null;
  ensureWeek: (
    anchorKey: string,
    mode: AuthMode,
    deps: {
      planRevision: number;
      equipmentKey: string;
      programProfileKey: string;
      stretchDefaultsKey: string;
    },
    options?: EnsureWeekOptions,
  ) => Promise<TrainingWeekDays>;
  /** After a custom day save + plan revision bump — avoids a redundant DB resolve. */
  applySavedWeek: (
    anchorKey: string,
    depsKey: string,
    planRevision: number,
    weekByDow: TrainingWeekDays,
    weekSource?: string | null,
  ) => void;
  invalidate: () => void;
};

const inflightByKey = new Map<string, Promise<TrainingWeekDays>>();

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

/** Read cached week `source` when the entry matches `dateKey`, else `undefined`. */
export function readWeekSourceFromCache(dateKey: string): string | null | undefined {
  const anchorKey = normalizeWeekAnchorKey(dateKey);
  if (!anchorKey) return undefined;
  const entry = useTrainingWeekStore.getState().entry;
  if (!entry || entry.anchorKey !== anchorKey) return undefined;
  return entry.weekSource;
}

function cacheHit(
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

export const useTrainingWeekStore = create<TrainingWeekState>((set, get) => ({
  entry: null,
  loadingAnchorKey: null,
  error: null,

  ensureWeek: async (anyDateKeyInWeek, mode, deps, options) => {
    const anchorKey = normalizeWeekAnchorKey(anyDateKeyInWeek);
    if (!anchorKey || mode === "loading") {
      return {};
    }

    const depsKey = buildTrainingWeekDepsKey({
      mode,
      equipmentKey: deps.equipmentKey,
      programProfileKey: deps.programProfileKey,
      stretchDefaultsKey: deps.stretchDefaultsKey,
    });
    const { planRevision } = deps;

    if (!options?.force) {
      const hit = cacheHit(get().entry, anchorKey, depsKey, planRevision);
      if (hit) return hit;
    }

    const inflightKey = `${anchorKey}|${depsKey}|${planRevision}`;
    const existing = inflightByKey.get(inflightKey);
    if (existing) return existing;

    set({ loadingAnchorKey: anchorKey, error: null });

    const promise = (async () => {
      try {
        const { resolveTrainingWeekBundleForAuth } = await import(
          "@/lib/planResolver"
        );
        const bundle = await resolveTrainingWeekBundleForAuth(anchorKey, mode);
        set({
          entry: {
            anchorKey,
            depsKey,
            planRevision,
            weekByDow: bundle.days,
            weekSource: bundle.source,
          },
          loadingAnchorKey: null,
          error: null,
        });
        return bundle.days;
      } catch (err) {
        console.error("[useTrainingWeekStore.ensureWeek]", err);
        const message =
          err instanceof Error ? err.message : "Failed to load training week";
        set({ loadingAnchorKey: null, error: message });
        throw err;
      } finally {
        inflightByKey.delete(inflightKey);
      }
    })();

    inflightByKey.set(inflightKey, promise);
    return promise;
  },

  applySavedWeek: (anchorKey, depsKey, planRevision, weekByDow, weekSource) => {
    set({
      entry: {
        anchorKey,
        depsKey,
        planRevision,
        weekByDow,
        weekSource: weekSource ?? TRAINING_WEEK_SOURCE_CUSTOM_V1,
      },
      loadingAnchorKey: null,
      error: null,
    });
    for (const key of [...inflightByKey.keys()]) {
      if (key.startsWith(`${anchorKey}|${depsKey}|`)) {
        inflightByKey.delete(key);
      }
    }
  },

  invalidate: () => {
    inflightByKey.clear();
    set({ entry: null, loadingAnchorKey: null, error: null });
  },
}));

/** Merge one saved day into the cached week after `bumpTrainingWeekPlans`. */
export function applyCustomDaySaveToWeekCache(
  dateKey: string,
  mergedWeek: TrainingWeekDays,
  deps: {
    mode: AuthMode;
    planRevision: number;
    equipmentKey: string;
    programProfileKey: string;
    stretchDefaultsKey: string;
  },
  weekSource?: string | null,
): void {
  const anchor = weekAnchorFromDateKey(dateKey);
  if (!anchor) return;
  const depsKey = buildTrainingWeekDepsKey({
    mode: deps.mode,
    equipmentKey: deps.equipmentKey,
    programProfileKey: deps.programProfileKey,
    stretchDefaultsKey: deps.stretchDefaultsKey,
  });
  useTrainingWeekStore
    .getState()
    .applySavedWeek(
      anchor.weekKey,
      depsKey,
      deps.planRevision,
      mergedWeek,
      weekSource,
    );
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
