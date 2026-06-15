"use client";

import { create } from "zustand";
import { TRAINING_WEEK_SOURCE_CUSTOM_V1 } from "@/lib/planGenerator";
import type { TrainingWeekDays } from "@/lib/repos";
import { buildTrainingWeekDepsKey } from "@/lib/trainingWeekCacheKey";
import type { AuthMode } from "@/core";
import {
  fetchTrainingWeekBundle,
  normalizeWeekAnchorKey,
  readWeekFromCache,
  type TrainingWeekStoreDeps,
  type WeekCacheEntry,
} from "@/use-cases";

export type {
  TrainingWeekStoreDeps,
  WeekCacheEntry,
} from "@/use-cases";
export {
  dayPlanFromWeekCache,
  normalizeWeekAnchorKey,
  weekCacheEntryMatches,
} from "@/use-cases";

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
    deps: TrainingWeekStoreDeps,
    options?: EnsureWeekOptions,
  ) => Promise<TrainingWeekDays>;
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
      const hit = readWeekFromCache(
        get().entry,
        anchorKey,
        depsKey,
        planRevision,
      );
      if (hit) return hit;
    }

    const inflightKey = `${anchorKey}|${depsKey}|${planRevision}`;
    const existing = inflightByKey.get(inflightKey);
    if (existing) return existing;

    set({ loadingAnchorKey: anchorKey, error: null });

    const promise = (async () => {
      try {
        const bundle = await fetchTrainingWeekBundle(anchorKey, mode);
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
