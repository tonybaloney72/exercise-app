"use client";

import { useCallback, useEffect } from "react";
import {
  useDailyHealthStore,
  type DailyHealthUnavailableReason,
} from "@/stores/useDailyHealthStore";
import { HEALTH_METRICS_REFRESH_EVENT } from "@/lib/health/healthMetricsRefresh";
import type { DailyHealthMetricChartPoint } from "@/lib/health/dailyHealthChart";
import type { DailyStepsChartPoint } from "@/lib/health/dailyStepsChart";
import { useAuthStore } from "@/stores/useAuthStore";

export type { DailyHealthUnavailableReason };

export type DailyHealthState = {
  available: boolean;
  loading: boolean;
  todaySteps: number | null;
  todayActiveKcal: number | null;
  todayAvgHeartRateBpm: number | null;
  todayRestingHeartRateBpm: number | null;
  todayOxygenSaturationPct: number | null;
  todaySleepTotalMin: number | null;
  todayVo2MaxMlKgMin: number | null;
  stepsChartSeries: DailyStepsChartPoint[];
  activeKcalChartSeries: DailyHealthMetricChartPoint[];
  avgHeartRateChartSeries: DailyHealthMetricChartPoint[];
  restingHeartRateChartSeries: DailyHealthMetricChartPoint[];
  oxygenSaturationChartSeries: DailyHealthMetricChartPoint[];
  sleepTotalChartSeries: DailyHealthMetricChartPoint[];
  vo2MaxChartSeries: DailyHealthMetricChartPoint[];
  refresh: () => void;
  unavailableReason: DailyHealthUnavailableReason | null;
};

export function useDailyHealthFromHealth(): DailyHealthState {
  const authMode = useAuthStore((s) => s.mode);
  const available = useDailyHealthStore((s) => s.available);
  const loading = useDailyHealthStore((s) => s.loading);
  const unavailableReason = useDailyHealthStore((s) => s.unavailableReason);
  const progress = useDailyHealthStore((s) => s.progress);
  const load = useDailyHealthStore((s) => s.load);

  const refresh = useCallback(() => {
    void load(authMode, { force: true });
  }, [authMode, load]);

  useEffect(() => {
    void load(authMode);
  }, [authMode, load]);

  return {
    available,
    loading,
    todaySteps: progress.todaySteps,
    todayActiveKcal: progress.todayActiveKcal,
    todayAvgHeartRateBpm: progress.todayAvgHeartRateBpm,
    todayRestingHeartRateBpm: progress.todayRestingHeartRateBpm,
    todayOxygenSaturationPct: progress.todayOxygenSaturationPct,
    todaySleepTotalMin: progress.todaySleepTotalMin,
    todayVo2MaxMlKgMin: progress.todayVo2MaxMlKgMin,
    stepsChartSeries: progress.stepsChartSeries,
    activeKcalChartSeries: progress.activeKcalChartSeries,
    avgHeartRateChartSeries: progress.avgHeartRateChartSeries,
    restingHeartRateChartSeries: progress.restingHeartRateChartSeries,
    oxygenSaturationChartSeries: progress.oxygenSaturationChartSeries,
    sleepTotalChartSeries: progress.sleepTotalChartSeries,
    vo2MaxChartSeries: progress.vo2MaxChartSeries,
    refresh,
    unavailableReason,
  };
}

/** Reload daily HC metrics on app foreground and pull-to-refresh (all tabs). */
export function useDailyHealthRefreshListeners(): void {
  const authMode = useAuthStore((s) => s.mode);
  const load = useDailyHealthStore((s) => s.load);

  useEffect(() => {
    if (authMode === "loading") return;

    function refreshOnVisible() {
      if (document.visibilityState === "visible") {
        void load(authMode);
      }
    }
    function refreshOnHealthEvent(event: Event) {
      const force =
        event instanceof CustomEvent &&
        typeof event.detail?.force === "boolean"
          ? event.detail.force
          : true;
      void load(authMode, { force });
    }
    function refreshOnFocus() {
      void load(authMode);
    }

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);
    window.addEventListener(HEALTH_METRICS_REFRESH_EVENT, refreshOnHealthEvent);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
      window.removeEventListener(
        HEALTH_METRICS_REFRESH_EVENT,
        refreshOnHealthEvent,
      );
    };
  }, [authMode, load]);
}
