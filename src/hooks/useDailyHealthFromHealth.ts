"use client";

import { useCallback, useEffect, useState } from "react";
import {
  checkCardioHealthReadAccess,
  fetchDailyHealthMetrics,
  fetchDailyHealthMetricsForKeys,
  lastNLocalDateKeys,
} from "@/lib/health/cardioHealth";
import { buildDailyStepsChartSeries } from "@/lib/health/dailyStepsChart";
import type { DailyStepsChartPoint } from "@/lib/health/dailyStepsChart";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { formatLocalDateKey } from "@/utils/localDateKey";

const DAILY_HEALTH_CHART_DAYS = 14;

export type DailyHealthUnavailableReason = "web" | "no_access";

export type DailyHealthState = {
  /** Native app with Health Connect read access granted. */
  available: boolean;
  loading: boolean;
  todaySteps: number | null;
  todayActiveKcal: number | null;
  todayAvgHeartRateBpm: number | null;
  chartSeries: DailyStepsChartPoint[];
  refresh: () => void;
  unavailableReason: DailyHealthUnavailableReason | null;
};

export function useDailyHealthFromHealth(): DailyHealthState {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(isNativePlatform());
  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [todayActiveKcal, setTodayActiveKcal] = useState<number | null>(null);
  const [todayAvgHeartRateBpm, setTodayAvgHeartRateBpm] = useState<number | null>(
    null,
  );
  const [chartSeries, setChartSeries] = useState<DailyStepsChartPoint[]>([]);
  const [unavailableReason, setUnavailableReason] =
    useState<DailyHealthUnavailableReason | null>(
      isNativePlatform() ? null : "web",
    );

  const load = useCallback(async () => {
    if (!isNativePlatform()) {
      setAvailable(false);
      setLoading(false);
      setTodaySteps(null);
      setTodayActiveKcal(null);
      setTodayAvgHeartRateBpm(null);
      setChartSeries([]);
      setUnavailableReason("web");
      return;
    }

    setLoading(true);
    try {
      const granted = await checkCardioHealthReadAccess();
      if (!granted) {
        setAvailable(false);
        setTodaySteps(null);
        setTodayActiveKcal(null);
        setTodayAvgHeartRateBpm(null);
        setChartSeries([]);
        setUnavailableReason("no_access");
        return;
      }

      setAvailable(true);
      setUnavailableReason(null);
      const now = new Date();
      const todayKey = formatLocalDateKey(now);
      const dayKeys = lastNLocalDateKeys(DAILY_HEALTH_CHART_DAYS, now);
      const [today, byDate] = await Promise.all([
        fetchDailyHealthMetrics(todayKey, now),
        fetchDailyHealthMetricsForKeys(dayKeys, now),
      ]);

      setTodaySteps(today?.steps ?? null);
      setTodayActiveKcal(today?.activeKcal ?? null);
      setTodayAvgHeartRateBpm(today?.avgHeartRateBpm ?? null);
      setChartSeries(
        buildDailyStepsChartSeries(
          Object.fromEntries(
            Object.entries(byDate).map(([date, metrics]) => [
              date,
              metrics.steps,
            ]),
          ),
        ),
      );
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
    todayActiveKcal,
    todayAvgHeartRateBpm,
    chartSeries,
    refresh: load,
    unavailableReason,
  };
}
