"use client";

import { useCallback, useEffect, useState } from "react";
import {
  checkCardioHealthReadAccess,
  fetchDailyHealthMetrics,
  fetchDailyHealthMetricsForKeys,
  lastNLocalDateKeys,
} from "@/lib/health/cardioHealth";
import {
  buildDailyHealthProgressFromRecords,
  mergeLiveTodayOverProgressView,
  recordsHaveAnySyncedData,
} from "@/lib/health/dailyHealthRecords";
import {
  DAILY_HEALTH_CHART_DAYS,
  syncDailyHealthMetricsToRepo,
} from "@/lib/health/dailyHealthSync";
import { HEALTH_METRICS_REFRESH_EVENT } from "@/lib/health/healthMetricsRefresh";
import type { DailyStepsChartPoint } from "@/lib/health/dailyStepsChart";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { getDailyHealthMetricRepo } from "@/lib/repos";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

export type DailyHealthUnavailableReason = "web" | "no_access";

export type DailyHealthState = {
  /** Health data available from HC and/or synced daily metrics. */
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
  const authMode = useAuthStore((s) => s.mode);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [todayActiveKcal, setTodayActiveKcal] = useState<number | null>(null);
  const [todayAvgHeartRateBpm, setTodayAvgHeartRateBpm] = useState<number | null>(
    null,
  );
  const [chartSeries, setChartSeries] = useState<DailyStepsChartPoint[]>([]);
  const [unavailableReason, setUnavailableReason] =
    useState<DailyHealthUnavailableReason | null>(null);

  const applyView = useCallback(
    (view: ReturnType<typeof buildDailyHealthProgressFromRecords>) => {
      setTodaySteps(view.todaySteps);
      setTodayActiveKcal(view.todayActiveKcal);
      setTodayAvgHeartRateBpm(view.todayAvgHeartRateBpm);
      setChartSeries(view.chartSeries);
    },
    [],
  );

  const load = useCallback(async (options?: { force?: boolean }) => {
    if (authMode === "loading") return;

    setLoading(true);
    try {
      const now = new Date();
      const todayKey = formatLocalDateKey(now);
      const dayKeys = lastNLocalDateKeys(DAILY_HEALTH_CHART_DAYS, now);
      const sinceKey = dayKeys[0] ?? todayKey;
      const repo = getDailyHealthMetricRepo(authMode);

      let records = await repo.listSince(sinceKey);
      let view = buildDailyHealthProgressFromRecords(records, todayKey, dayKeys);

      let hcGranted = false;
      if (isNativePlatform()) {
        hcGranted = await checkCardioHealthReadAccess();
        if (hcGranted) {
          const metricsByDate = await fetchDailyHealthMetricsForKeys(
            dayKeys,
            now,
          );
          const liveToday = await fetchDailyHealthMetrics(todayKey, now);

          try {
            await syncDailyHealthMetricsToRepo({
              repo,
              todayKey,
              metricsByDate,
              force: options?.force,
            });
            records = await repo.listSince(sinceKey);
            view = buildDailyHealthProgressFromRecords(
              records,
              todayKey,
              dayKeys,
            );
          } catch (err) {
            console.error("[useDailyHealthFromHealth] sync failed", err);
          }

          view = mergeLiveTodayOverProgressView(view, todayKey, liveToday);
          setAvailable(true);
          setUnavailableReason(null);
          applyView(view);
          return;
        }
      }

      const hasSynced = recordsHaveAnySyncedData(records);
      setAvailable(hasSynced);
      applyView(view);

      if (hasSynced) {
        setUnavailableReason(null);
      } else if (isNativePlatform()) {
        setUnavailableReason("no_access");
      } else {
        setUnavailableReason("web");
      }
    } finally {
      setLoading(false);
    }
  }, [applyView, authMode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function refreshOnVisible() {
      if (document.visibilityState === "visible") void load();
    }
    function refreshOnHealthEvent(event: Event) {
      const force =
        event instanceof CustomEvent &&
        typeof event.detail?.force === "boolean"
          ? event.detail.force
          : true;
      void load({ force });
    }
    function refreshOnFocus() {
      void load();
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
  }, [load]);

  return {
    available,
    loading,
    todaySteps,
    todayActiveKcal,
    todayAvgHeartRateBpm,
    chartSeries,
    refresh: () => load({ force: true }),
    unavailableReason,
  };
}
