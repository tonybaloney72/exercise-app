"use client";

import { useMemo } from "react";
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
import {
  PROGRESS_AXIS_TICK,
  PROGRESS_BAR_CURSOR,
  PROGRESS_CARTESIAN_GRID,
  PROGRESS_CHART_MARGIN,
  PROGRESS_LINE_CURSOR,
  PROGRESS_LINE_STROKE,
  PROGRESS_TOOLTIP_CONTENT_STYLE,
  PROGRESS_TOOLTIP_PANEL_CLASS,
  progressLineActiveDot,
  progressLineDot,
  progressYAxisLabel,
} from "@/components/progress/rechartsProgressDefaults";

interface Props {
  history: WorkoutLog[];
}

function HealthTooltip({ point }: { point: CardioHealthChartPoint }) {
  return (
    <div
      className={PROGRESS_TOOLTIP_PANEL_CLASS}
      style={PROGRESS_TOOLTIP_CONTENT_STYLE}
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
  const tooltipCursor =
    dataKey === "avgHeartRateBpm" ? PROGRESS_LINE_CURSOR : PROGRESS_BAR_CURSOR;

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
            margin={PROGRESS_CHART_MARGIN.legend}
          >
            <CartesianGrid {...PROGRESS_CARTESIAN_GRID} />
            <XAxis
              dataKey="xLabel"
              tick={PROGRESS_AXIS_TICK}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={48}
              tick={PROGRESS_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              allowDecimals={dataKey === "avgHeartRateBpm"}
              label={progressYAxisLabel(yLabel, 4)}
            />
            <Tooltip
              cursor={tooltipCursor}
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
                {...PROGRESS_LINE_STROKE}
                dot={progressLineDot()}
                activeDot={progressLineActiveDot()}
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
