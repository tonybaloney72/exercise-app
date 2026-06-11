"use client";

import { useMemo } from "react";
import { usePlanResolverDeps } from "@/hooks/usePlanResolverDeps";
import { selectStretchDefaultsKey } from "@/lib/planResolverDeps";
import { buildTrainingWeekDepsKey } from "@/lib/trainingWeekCacheKey";
import { useSettingsStore } from "@/stores/useSettingsStore";
import {
  normalizeWeekAnchorKey,
  useTrainingWeekStore,
  weekCacheEntryMatches,
} from "@/stores/useTrainingWeekStore";
import { parseLocalDateKey } from "@/utils/weekCalendar";

/** Week `source` from the session cache (null until the week row is loaded). */
export function useWeekSourceForDate(dateKey: string): string | null {
  const { planRevision, equipmentKey, programProfileKey, mode } =
    usePlanResolverDeps();
  const stretchDefaultsKey = useSettingsStore(selectStretchDefaultsKey);

  const anchorKey = useMemo(() => {
    if (!dateKey.trim() || !parseLocalDateKey(dateKey)) return "";
    return normalizeWeekAnchorKey(dateKey) ?? "";
  }, [dateKey]);

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

  return useTrainingWeekStore((s) => {
    if (!weekCacheEntryMatches(s.entry, anchorKey, depsKey, planRevision)) {
      return null;
    }
    return s.entry!.weekSource;
  });
}
