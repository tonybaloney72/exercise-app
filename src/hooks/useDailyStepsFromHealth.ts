"use client";

import { useCallback, useEffect, useState } from "react";
import {
  checkCardioHealthReadAccess,
  fetchDailyStepCount,
  fetchDailyStepCountsForKeys,
  lastNLocalDateKeys,
} from "@/lib/health/cardioHealth";
import { buildDailyStepsChartSeries } from "@/lib/health/dailyStepsChart";
import type { DailyStepsChartPoint } from "@/lib/health/dailyStepsChart";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { formatLocalDateKey } from "@/utils/localDateKey";

export const DAILY_STEPS_CHART_DAYS = 14;

export type DailyStepsHealthState = {
  /** Native app with Health Connect read access granted. */
  available: boolean;
  loading: boolean;
  todaySteps: number | null;
  chartSeries: DailyStepsChartPoint[];
  refresh: () => void;
};

export function useDailyStepsFromHealth(): DailyStepsHealthState {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(isNativePlatform());
  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [chartSeries, setChartSeries] = useState<DailyStepsChartPoint[]>([]);

  const load = useCallback(async () => {
    if (!isNativePlatform()) {
      setAvailable(false);
      setLoading(false);
      setTodaySteps(null);
      setChartSeries([]);
      return;
    }

    setLoading(true);
    try {
      const granted = await checkCardioHealthReadAccess();
      if (!granted) {
        setAvailable(false);
        setTodaySteps(null);
        setChartSeries([]);
        return;
      }

      setAvailable(true);
      const now = new Date();
      const todayKey = formatLocalDateKey(now);
      const dayKeys = lastNLocalDateKeys(DAILY_STEPS_CHART_DAYS, now);
      const [today, byDate] = await Promise.all([
        fetchDailyStepCount(todayKey, now),
        fetchDailyStepCountsForKeys(dayKeys, now),
      ]);

      setTodaySteps(today ?? null);
      setChartSeries(buildDailyStepsChartSeries(byDate));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function refreshOnVisible() {
      if (document.visibilityState === "visible") void load();
    }
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => {
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [load]);

  return {
    available,
    loading,
    todaySteps,
    chartSeries,
    refresh: load,
  };
}
