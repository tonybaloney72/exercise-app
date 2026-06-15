"use client";

import { useEffect, useMemo } from "react";
import { usePlanResolverDeps } from "@/hooks/usePlanResolverDeps";
import { selectStretchDefaultsKey } from "@/lib/planResolverDeps";
import { buildTrainingWeekDepsKey } from "@/lib/trainingWeekCacheKey";
import { settingsHydrationMatchesAuth } from "@/lib/settingsHydration";
import type { TrainingWeekDays } from "@/lib/repos";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  normalizeWeekAnchorKey,
  weekCacheEntryMatches,
} from "@/use-cases/trainingWeek/weekCache";
import { useTrainingWeekStore } from "@/stores/useTrainingWeekStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

/**
 * Current calendar week`s day plans via `planResolver` (materialized for guests;
 * persisted lazy-seeded week when signed in) - same source as Today and weekly day routes.
 */
export function useTrainingWeekPlans(weekDates: Date[]): {
  weekByDow: TrainingWeekDays | null;
  loading: boolean;
  error: string | null;
} {
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id);
  const settingsHydrated = useSettingsStore((s) =>
    settingsHydrationMatchesAuth(mode, userId, s.hydratedForAuthKey),
  );
  const { planRevision, equipmentKey, programProfileKey } =
    usePlanResolverDeps();
  const stretchDefaultsKey = useSettingsStore(selectStretchDefaultsKey);

  const anchorKey = useMemo(() => {
    if (weekDates.length === 0) return "";
    return normalizeWeekAnchorKey(formatLocalDateKey(weekDates[0])) ?? "";
  }, [weekDates]);

  const depsKey = useMemo(
    () =>
      anchorKey && mode !== "loading"
        ? buildTrainingWeekDepsKey({
            mode,
            equipmentKey,
            programProfileKey,
            stretchDefaultsKey,
          })
        : "",
    [anchorKey, mode, equipmentKey, programProfileKey, stretchDefaultsKey],
  );

  const cacheMatches = useTrainingWeekStore((s) =>
    weekCacheEntryMatches(s.entry, anchorKey, depsKey, planRevision),
  );

  const weekByDow = useTrainingWeekStore((s) => {
    if (!weekCacheEntryMatches(s.entry, anchorKey, depsKey, planRevision)) {
      return null;
    }
    return s.entry!.weekByDow;
  });

  const weekLoading = useTrainingWeekStore(
    (s) => !!anchorKey && s.loadingAnchorKey === anchorKey,
  );
  const storeError = useTrainingWeekStore((s) => s.error);

  useEffect(() => {
    if (!anchorKey || mode === "loading" || !settingsHydrated || cacheMatches) {
      return;
    }

    void useTrainingWeekStore.getState().ensureWeek(anchorKey, mode, {
      planRevision,
      equipmentKey,
      programProfileKey,
      stretchDefaultsKey,
    });
  }, [
    anchorKey,
    mode,
    settingsHydrated,
    planRevision,
    equipmentKey,
    programProfileKey,
    stretchDefaultsKey,
    depsKey,
    cacheMatches,
  ]);

  const waitingForWeek =
    !!anchorKey &&
    (mode === "loading" || !settingsHydrated || !cacheMatches || weekLoading);

  return {
    weekByDow,
    loading: waitingForWeek && storeError == null,
    error:
      !!anchorKey && !waitingForWeek && weekByDow == null ? storeError : null,
  };
}
