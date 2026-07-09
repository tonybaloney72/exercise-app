"use client";

import { useEffect, useMemo } from "react";
import HourlyHealthChart from "@/components/health/HourlyHealthChart";
import HealthRecordLogList from "@/components/health/HealthRecordLogList";
import { useHealthTodayDetail } from "@/hooks/useHealthTodayDetail";
import type { DailyHealthUnavailableReason } from "@/hooks/useDailyHealthFromHealth";
import {
  healthStatDisplayForSlug,
  type HealthStatSlug,
} from "@/lib/health/healthStatRoutes";
import { filterEntriesByHealthRange } from "@/lib/health/healthRangePresets";
import { formatWeightLb } from "@/lib/weightLog";
import { useWeightStore } from "@/stores/useWeightStore";
import { useAuthStore } from "@/stores/useAuthStore";

type TodayStatConfig = {
  subtitle: string;
  yLabel: string;
  chartType: "bar" | "line";
  allowDecimals?: boolean;
  emptyDetail: string;
  formatValue: (value: number) => string;
};

const TODAY_STAT_CONFIG: Partial<Record<HealthStatSlug, TodayStatConfig>> = {
  steps: {
    subtitle: "Steps by hour from Health Connect.",
    yLabel: "steps",
    chartType: "bar",
    emptyDetail: "No step records for today yet.",
    formatValue: (value) => `${Math.round(value).toLocaleString()} steps`,
  },
  "heart-rate": {
    subtitle: "Average heart rate by hour.",
    yLabel: "bpm",
    chartType: "line",
    allowDecimals: true,
    emptyDetail: "No heart rate readings for today yet.",
    formatValue: (value) => `${Math.round(value)} bpm`,
  },
  "resting-heart-rate": {
    subtitle: "Resting heart rate readings today.",
    yLabel: "bpm",
    chartType: "line",
    allowDecimals: true,
    emptyDetail: "No resting heart rate readings for today yet.",
    formatValue: (value) => `${Math.round(value)} bpm`,
  },
  "blood-oxygen": {
    subtitle: "Average SpO₂ by hour.",
    yLabel: "%",
    chartType: "line",
    allowDecimals: true,
    emptyDetail: "No blood oxygen readings for today yet.",
    formatValue: (value) => `${value.toFixed(1)}%`,
  },
  sleep: {
    subtitle: "Minutes asleep by hour (includes last night).",
    yLabel: "min",
    chartType: "bar",
    emptyDetail: "No sleep sessions ending today yet.",
    formatValue: (value) => `${Math.round(value)} min`,
  },
  "vo2-max": {
    subtitle: "VO₂ max readings today.",
    yLabel: "ml/kg/min",
    chartType: "line",
    allowDecimals: true,
    emptyDetail: "No VO₂ max readings for today yet.",
    formatValue: (value) => `${value.toFixed(1)}`,
  },
};

function unavailableCopy(reason: DailyHealthUnavailableReason): string {
  if (reason === "web") {
    return "Hourly breakdown and individual logs sync from Health Connect in the Android app.";
  }
  return "Connect Health Connect in Settings to see hourly breakdown and logs.";
}

type Props = {
  slug: HealthStatSlug;
  unavailableReason?: DailyHealthUnavailableReason | null;
};

export default function HealthTodayDetail({
  slug,
  unavailableReason,
}: Props) {
  const config = TODAY_STAT_CONFIG[slug];
  const display = healthStatDisplayForSlug(slug);
  const { loading, nativeAvailable, hourlySeries, logEntries, hasChartData } =
    useHealthTodayDetail(slug);

  if (!config || !display) return null;

  if (loading) {
    return <p className="text-sm text-muted">Loading today&apos;s data…</p>;
  }

  if (!nativeAvailable) {
    return (
      <div className="w-full rounded-xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center">
        <p className="text-sm text-muted">
          {unavailableReason
            ? unavailableCopy(unavailableReason)
            : "Hourly breakdown is available in the Android app with Health Connect."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs text-muted">{config.subtitle}</p>
      </div>
      {hasChartData ? (
        <HourlyHealthChart
          series={hourlySeries}
          yLabel={config.yLabel}
          formatValue={config.formatValue}
          chartType={config.chartType}
          allowDecimals={config.allowDecimals}
        />
      ) : (
        <div className="w-full rounded-xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center">
          <p className="text-sm text-muted">{config.emptyDetail}</p>
        </div>
      )}
      <HealthRecordLogList
        entries={logEntries}
        emptyDetail={config.emptyDetail}
      />
    </div>
  );
}

export function HealthTodayWeightDetail() {
  const mode = useAuthStore((s) => s.mode);
  const entries = useWeightStore((s) => s.entries);
  const load = useWeightStore((s) => s.load);

  useEffect(() => {
    if (mode === "loading") return;
    void load();
  }, [load, mode]);

  const todayEntries = useMemo(
    () => filterEntriesByHealthRange(entries, "today"),
    [entries],
  );

  const logEntries = useMemo(
    () =>
      [...todayEntries]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((entry, index) => ({
          id: `${entry.date}-${index}`,
          timeLabel: "Today",
          detailLabel: formatWeightLb(entry.weightLb),
          sortKey: index,
        })),
    [todayEntries],
  );

  return (
    <HealthRecordLogList
      title="Today's weight logs"
      entries={logEntries}
      emptyDetail="No weight logged today. Log on Home to add an entry."
    />
  );
}
