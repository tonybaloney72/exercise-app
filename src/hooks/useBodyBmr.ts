"use client";

import { useEffect, useMemo } from "react";
import {
  bodyProfileFromSettings,
  isBodyProfileComplete,
} from "@/lib/bodyProfile";
import {
  estimateDailyBmr,
  passiveKcalSoFarToday,
  sumDailyBmrForDateKeys,
} from "@/lib/nutrition/bmr";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useWeightStore } from "@/stores/useWeightStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

export function useBodyBmr(dateKey?: string) {
  const bodySexAtBirth = useSettingsStore((s) => s.bodySexAtBirth);
  const bodyBirthDate = useSettingsStore((s) => s.bodyBirthDate);
  const bodyHeightIn = useSettingsStore((s) => s.bodyHeightIn);
  const weightEntries = useWeightStore((s) => s.entries);
  const loadWeight = useWeightStore((s) => s.load);

  useEffect(() => {
    void loadWeight();
  }, [loadWeight]);

  const resolvedDateKey = dateKey ?? formatLocalDateKey();

  const profile = useMemo(
    () =>
      bodyProfileFromSettings({
        bodySexAtBirth,
        bodyBirthDate,
        bodyHeightIn,
      }),
    [bodyBirthDate, bodyHeightIn, bodySexAtBirth],
  );

  const profileComplete = isBodyProfileComplete(profile);

  const bmrDaily = useMemo(() => {
    if (!profileComplete) return null;
    return estimateDailyBmr({
      profile,
      weightEntries,
      dateKey: resolvedDateKey,
    });
  }, [profile, profileComplete, resolvedDateKey, weightEntries]);

  const bmrSoFarToday = useMemo(() => {
    if (bmrDaily == null) return null;
    return passiveKcalSoFarToday(bmrDaily);
  }, [bmrDaily]);

  return {
    profile,
    profileComplete,
    bmrDaily,
    bmrSoFarToday,
    sumBmrForDateKeys: (keys: readonly string[]) =>
      profileComplete
        ? sumDailyBmrForDateKeys(keys, profile, weightEntries)
        : null,
  };
}
