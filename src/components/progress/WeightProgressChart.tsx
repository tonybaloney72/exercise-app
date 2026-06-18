"use client";

import { useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  buildWeightChartSeries,
  formatWeightChartDateLabel,
  formatWeightLb,
  weightChartSpansYears,
} from "@/lib/weightLog";
import {
  WEIGHT_RANGE_PRESETS,
  filterWeightEntriesByRange,
} from "@/lib/weightRangePresets";
import { uiChoicePillSolidClass } from "@/lib/uiClasses";
import { settingsHydrationMatchesAuth } from "@/lib/settingsHydration";
import { useWeightStore } from "@/stores/useWeightStore";
import { useAuthStore } from "@/stores/useAuthStore";
import EmptyState from "@/components/common/EmptyState";
import SurfaceCard from "@/components/common/SurfaceCard";
import { PROGRESS_LINE_CHART_HEIGHT } from "@/components/progress/chartLayout";

const tooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border-color)",
  borderRadius: 10,
  color: "var(--foreground)",
  fontSize: 12,
};

const axisTick = { fill: "var(--muted)", fontSize: 11 };

export default function WeightProgressChart() {
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id);
  const entries = useWeightStore((s) => s.entries);
  const hydratedForAuthKey = useWeightStore((s) => s.hydratedForAuthKey);
  const rangePreset = useWeightStore((s) => s.rangePreset);
  const setRangePreset = useWeightStore((s) => s.setRangePreset);
  const load = useWeightStore((s) => s.load);

  const authReady = settingsHydrationMatchesAuth(
    mode,
    userId,
    hydratedForAuthKey,
  );

  useEffect(() => {
    if (mode === "loading") return;
    void load();
  }, [load, mode, userId]);

  const filteredEntries = useMemo(
    () => filterWeightEntriesByRange(entries, rangePreset),
    [entries, rangePreset],
  );

  const series = useMemo(
    () => buildWeightChartSeries(filteredEntries),
    [filteredEntries],
  );

  const showYearOnAxis = useMemo(() => weightChartSpansYears(series), [series]);

  if (!authReady) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Body weight</h2>
          <p className="text-xs text-muted mt-0.5">Loading weight history…</p>
        </div>
        <SurfaceCard className="w-full p-2 py-3">
          <div
            className="flex items-center justify-center text-xs text-muted"
            style={{ height: PROGRESS_LINE_CHART_HEIGHT }}
          >
            Loading chart…
          </div>
        </SurfaceCard>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Body weight</h2>
          <p className="text-xs text-muted mt-0.5">
            One entry per day; log on Today to see gains and losses over time
          </p>
        </div>
        <SurfaceCard className="border-dashed bg-surface/50 px-4 py-8">
          <EmptyState
            title="No weight logged yet."
            description="Use the body weight field on Today to start your trend line."
            action={{ label: "Go to Today", href: "/today" }}
            className="text-xs"
          />
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Body weight</h2>
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Chart time range"
        >
          {WEIGHT_RANGE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setRangePreset(preset.id)}
              className={uiChoicePillSolidClass(rangePreset === preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      {series.length === 0 ? (
        <SurfaceCard className="flex flex-col border-dashed bg-surface/50 px-4 py-8 text-center gap-3">
          <p className="text-sm font-medium text-foreground">
            No entries in this range.
          </p>
          <p className="text-xs text-muted">
            Try a wider time range or log weight on Today.
          </p>
          <button
            type="button"
            onClick={() => setRangePreset("all")}
            className="inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Show all time
          </button>
        </SurfaceCard>
      ) : (
        <SurfaceCard className="w-full p-2 py-3">
          <ResponsiveContainer
            width="100%"
            height={PROGRESS_LINE_CHART_HEIGHT}
            minWidth={0}
          >
            <LineChart
              data={series}
              margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                stroke="var(--border-color)"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="index"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickFormatter={(index) => {
                  const point = series[Number(index)];
                  return point
                    ? formatWeightChartDateLabel(point.date, showYearOnAxis)
                    : "";
                }}
              />
              <YAxis
                width={44}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                label={{
                  value: "lb",
                  angle: -90,
                  position: "insideLeft",
                  fill: "var(--muted)",
                  fontSize: 10,
                  offset: 0,
                }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as
                    | { date?: string }
                    | undefined;
                  return row?.date ?? "";
                }}
                formatter={(value) => [
                  formatWeightLb(Number(value ?? 0)),
                  "Weight",
                ]}
              />
              <Line
                type="monotone"
                dataKey="weightLb"
                name="Weight"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--accent)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </SurfaceCard>
      )}
    </div>
  );
}
