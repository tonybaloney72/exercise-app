"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveTrainingWeekForAuth } from "@/lib/planResolver";
import type { TrainingWeekDays } from "@/lib/repos";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTrainingWeekRefreshStore } from "@/stores/useTrainingWeekRefreshStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

/**
 * Current calendar week`s day plans: catalog-only for guests; persisted (lazy-seeded) week
 * for signed-in users — same source as Today and `/weekly/day/[date]`.
 */
export function useTrainingWeekPlans(weekDates: Date[]): {
  weekByDow: TrainingWeekDays | null;
  loading: boolean;
  error: string | null;
} {
  const mode = useAuthStore((s) => s.mode);
  const planRevision = useTrainingWeekRefreshStore((s) => s.planRevision);
  const equipmentKey = useSettingsStore((s) => s.availableEquipment.join(","));

  const anchorKey = useMemo(
    () => (weekDates.length > 0 ? formatLocalDateKey(weekDates[0]) : ""),
    [weekDates],
  );

  const [weekByDow, setWeekByDow] = useState<TrainingWeekDays | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!anchorKey) {
      setWeekByDow(null);
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

    void resolveTrainingWeekForAuth(anchorKey, mode).then(
      (w) => {
        if (!cancelled) {
          setWeekByDow(w);
          setLoading(false);
        }
      },
      (e: unknown) => {
        console.error("[useTrainingWeekPlans]", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load week");
          setWeekByDow(null);
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [anchorKey, mode, planRevision, equipmentKey]);

  return { weekByDow, loading, error };
}
