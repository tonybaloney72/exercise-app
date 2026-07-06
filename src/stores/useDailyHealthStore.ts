import { create } from "zustand";
import {
  checkCardioHealthReadAccess,
  fetchDailyHealthMetrics,
  fetchDailyHealthMetricsForKeys,
  fetchVo2MaxHistory,
  lastNLocalDateKeys,
} from "@/lib/health/cardioHealth";
import {
  buildDailyHealthProgressFromRecords,
  mergeLiveTodayOverProgressView,
  recordsHaveAnySyncedData,
  type DailyHealthProgressView,
} from "@/lib/health/dailyHealthRecords";
import {
  DAILY_HEALTH_CHART_DAYS,
  DAILY_HEALTH_HISTORY_DAYS,
  syncDailyHealthMetricsToRepo,
} from "@/lib/health/dailyHealthSync";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { getDailyHealthMetricRepo } from "@/lib/repos";
import type { AuthMode } from "@/core/types/auth";
import { formatLocalDateKey } from "@/utils/localDateKey";

export type DailyHealthUnavailableReason = "web" | "no_access";

type DailyHealthState = {
  available: boolean;
  loading: boolean;
  unavailableReason: DailyHealthUnavailableReason | null;
  progress: DailyHealthProgressView;
  load: (authMode: AuthMode, options?: { force?: boolean }) => Promise<void>;
};

const emptyProgress = (): DailyHealthProgressView => ({
  todaySteps: null,
  todayActiveKcal: null,
  todayAvgHeartRateBpm: null,
  todayRestingHeartRateBpm: null,
  todayOxygenSaturationPct: null,
  todaySleepTotalMin: null,
  todayVo2MaxMlKgMin: null,
  stepsChartSeries: [],
  activeKcalChartSeries: [],
  avgHeartRateChartSeries: [],
  restingHeartRateChartSeries: [],
  oxygenSaturationChartSeries: [],
  sleepTotalChartSeries: [],
  vo2MaxChartSeries: [],
});

export const useDailyHealthStore = create<DailyHealthState>((set) => ({
  available: false,
  loading: false,
  unavailableReason: null,
  progress: emptyProgress(),

  load: async (authMode, options) => {
    if (authMode === "loading") return;

    set({ loading: true });
    try {
      const now = new Date();
      const todayKey = formatLocalDateKey(now);
      const dayKeys = lastNLocalDateKeys(DAILY_HEALTH_HISTORY_DAYS, now);
      const hcSyncKeys = lastNLocalDateKeys(DAILY_HEALTH_CHART_DAYS, now);
      const sinceKey = dayKeys[0] ?? todayKey;
      const repo = getDailyHealthMetricRepo(authMode);

      let records = await repo.listSince(sinceKey);
      let view = buildDailyHealthProgressFromRecords(records, todayKey, dayKeys);

      if (isNativePlatform()) {
        const hcGranted = await checkCardioHealthReadAccess();
        if (hcGranted) {
          const metricsByDate = await fetchDailyHealthMetricsForKeys(
            hcSyncKeys,
            now,
          );
          const vo2History = await fetchVo2MaxHistory(now);
          for (const row of vo2History) {
            const existing = metricsByDate[row.dateKey] ?? {
              steps: 0,
              activeKcal: 0,
            };
            metricsByDate[row.dateKey] = {
              ...existing,
              vo2MaxMlKgMin: row.value,
            };
          }
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
            console.error("[useDailyHealthStore] sync failed", err);
          }

          view = mergeLiveTodayOverProgressView(view, todayKey, liveToday);
          set({
            available: true,
            unavailableReason: null,
            progress: view,
          });
          return;
        }
      }

      const hasSynced = recordsHaveAnySyncedData(records);
      set({
        available: hasSynced,
        progress: view,
        unavailableReason: hasSynced
          ? null
          : isNativePlatform()
            ? "no_access"
            : "web",
      });
    } finally {
      set({ loading: false });
    }
  },
}));
