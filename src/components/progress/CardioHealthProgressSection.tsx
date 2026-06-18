"use client";

import { useMemo, type CSSProperties } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  buildCardioHealthChartSeries,
  type CardioHealthChartPoint,
} from "@/utils/cardioHealthProgressStats";
import { PROGRESS_LINE_CHART_HEIGHT } from "@/components/progress/chartLayout";
import type { WorkoutLog } from "@/types";

const tooltipStyle: CSSProperties = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border-color)",
  borderRadius: 10,
  color: "var(--foreground)",
  fontSize: 12,
};

const axisTick = { fill: "var(--muted)", fontSize: 11 };

interface Props {
  history: WorkoutLog[];
}

function HealthTooltip({ point }: { point: CardioHealthChartPoint }) {
  return (
    <div
      className="rounded-lg border border-border px-3 py-2 text-xs shadow-lg"
      style={tooltipStyle}
    >
      <p className="font-semibold text-foreground">
        {point.date}
        {point.sessionIndex != null ? ` · Session ${point.sessionIndex}` : ""}
      </p>
      {point.stepCount != null ? (
        <p className="mt-1 text-muted">
          Steps: {point.stepCount.toLocaleString()}
        </p>
      ) : null}
      {point.activeCaloriesKcal != null ? (
        <p className="text-muted">
          Active kcal: {Math.round(point.activeCaloriesKcal)}
        </p>
      ) : null}
      {point.avgHeartRateBpm != null ? (
        <p className="text-muted">
          Avg HR: {Math.round(point.avgHeartRateBpm)} bpm
        </p>
      ) : null}
    </div>
  );
}

function MetricChart({
  title,
  subtitle,
  data,
  dataKey,
  yLabel,
  formatValue,
}: {
  title: string;
  subtitle: string;
  data: CardioHealthChartPoint[];
  dataKey: "stepCount" | "activeCaloriesKcal" | "avgHeartRateBpm";
  yLabel: string;
  formatValue: (value: number) => string;
}) {
  const filtered = data.filter(
    (p) => p[dataKey] != null && (p[dataKey] as number) > 0,
  );
  if (filtered.length === 0) return null;

  const Chart = dataKey === "avgHeartRateBpm" ? LineChart : BarChart;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted mt-0.5">{subtitle}</p>
      </div>
      <div className="w-full rounded-xl border border-border bg-surface p-2 py-3">
        <ResponsiveContainer
          width="100%"
          height={PROGRESS_LINE_CHART_HEIGHT}
          minWidth={0}
        >
          <Chart
            data={filtered}
            margin={{ top: 28, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              stroke="var(--border-color)"
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              dataKey="xLabel"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={48}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              allowDecimals={dataKey === "avgHeartRateBpm"}
              label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                fill: "var(--muted)",
                fontSize: 10,
                offset: 4,
              }}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-hover)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload as CardioHealthChartPoint | undefined;
                if (!p) return null;
                return <HealthTooltip point={p} />;
              }}
            />
            <Legend
              verticalAlign="top"
              height={28}
              formatter={() => (
                <span className="text-xs text-muted">{yLabel}</span>
              )}
            />
            {dataKey === "avgHeartRateBpm" ? (
              <Line
                type="monotone"
                dataKey={dataKey}
                name={yLabel}
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{
                  r: 3,
                  fill: "var(--accent)",
                  stroke: "var(--background)",
                  strokeWidth: 1,
                }}
                connectNulls={false}
              />
            ) : (
              <Bar
                dataKey={dataKey}
                name={yLabel}
                fill="var(--accent)"
                fillOpacity={0.55}
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted">
        Latest session:{" "}
        {formatValue(filtered[filtered.length - 1]![dataKey] as number)}
      </p>
    </div>
  );
}

export default function CardioHealthProgressSection({ history }: Props) {
  const series = useMemo(
    () => buildCardioHealthChartSeries(history),
    [history],
  );

  if (series.length === 0) return null;

  return (
    <>
      <MetricChart
        title="Active calories (cardio)"
        subtitle="Active energy per completed cardio session when Health Connect provided it."
        data={series}
        dataKey="activeCaloriesKcal"
        yLabel="kcal"
        formatValue={(v) => `${Math.round(v)} kcal`}
      />
      <MetricChart
        title="Average heart rate (cardio)"
        subtitle="Session average HR when imported or synced from Health Connect."
        data={series}
        dataKey="avgHeartRateBpm"
        yLabel="bpm"
        formatValue={(v) => `${Math.round(v)} bpm`}
      />
    </>
  );
}
