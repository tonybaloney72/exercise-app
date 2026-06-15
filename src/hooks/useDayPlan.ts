"use client";

import { useEffect, useMemo } from "react";
import { usePlanResolverDeps } from "@/hooks/usePlanResolverDeps";
import { selectStretchDefaultsKey } from "@/lib/planResolverDeps";
import { buildTrainingWeekDepsKey } from "@/lib/trainingWeekCacheKey";
import { settingsHydrationMatchesAuth } from "@/lib/settingsHydration";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  dayPlanFromWeekCache,
  normalizeWeekAnchorKey,
  weekCacheEntryMatches,
} from "@/use-cases/trainingWeek/weekCache";
import { useTrainingWeekStore } from "@/stores/useTrainingWeekStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { DayPlan } from "@/types";
import { parseLocalDateKey } from "@/utils/weekCalendar";

export function useDayPlan(dateKey: string): {
  plan: DayPlan | null;
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

  const validDate = useMemo(
    () => !!dateKey.trim() && !!parseLocalDateKey(dateKey),
    [dateKey],
  );

  const anchorKey = useMemo(() => {
    if (!validDate) return "";
    return normalizeWeekAnchorKey(dateKey) ?? "";
  }, [dateKey, validDate]);

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

  const plan = useTrainingWeekStore((s) => {
    if (!weekCacheEntryMatches(s.entry, anchorKey, depsKey, planRevision)) {
      return null;
    }
    return dayPlanFromWeekCache(dateKey, s.entry);
  });

  const weekLoading = useTrainingWeekStore(
    (s) => validDate && s.loadingAnchorKey === anchorKey,
  );
  const storeError = useTrainingWeekStore((s) => s.error);

  useEffect(() => {
    if (
      !validDate ||
      !anchorKey ||
      mode === "loading" ||
      !settingsHydrated ||
      cacheMatches
    ) {
      return;
    }

    void useTrainingWeekStore.getState().ensureWeek(anchorKey, mode, {
      planRevision,
      equipmentKey,
      programProfileKey,
      stretchDefaultsKey,
    });
  }, [
    validDate,
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

  const waitingForPlan =
    validDate &&
    (mode === "loading" || !settingsHydrated || !cacheMatches || weekLoading);

  return {
    plan: validDate ? plan : null,
    loading: waitingForPlan && storeError == null,
    error: validDate && !waitingForPlan && plan == null ? storeError : null,
  };
}
