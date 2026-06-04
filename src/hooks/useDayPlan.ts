"use client";

import { useEffect, useState } from "react";
import { resolveDayPlanForAuth } from "@/lib/planResolver";
import { usePlanResolverDeps } from "@/hooks/usePlanResolverDeps";
import { selectProgramProfileKeyDayPlan } from "@/lib/planResolverDeps";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { DayPlan } from "@/types";
import { parseLocalDateKey } from "@/utils/weekCalendar";

export function useDayPlan(dateKey: string): {
  plan: DayPlan | null;
  loading: boolean;
  error: string | null;
} {
  const { mode, planRevision, equipmentKey, programProfileKey } =
    usePlanResolverDeps(selectProgramProfileKeyDayPlan);
  const stretchDefaultsKey = useSettingsStore((s) =>
    [...s.defaultWarmUp, ...s.defaultCoolDown]
      .map((e) => `${e.exerciseId}:${e.targetReps}`)
      .join("|"),
  );
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dateKey.trim() || !parseLocalDateKey(dateKey)) {
      setPlan(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (mode === "loading") {
      setLoading(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void resolveDayPlanForAuth(dateKey, mode).then(
      (p) => {
        if (!cancelled) {
          setPlan(p);
          setLoading(false);
        }
      },
      (e: unknown) => {
        console.error("[useDayPlan]", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load plan");
          setPlan(null);
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [dateKey, mode, planRevision, equipmentKey, programProfileKey, stretchDefaultsKey]);

  return { plan, loading, error };
}
