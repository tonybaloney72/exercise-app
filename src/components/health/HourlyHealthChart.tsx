"use client";

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
} from "recharts";
import type { HourlyHealthChartPoint } from "@/lib/health/healthTodayDetail";
import { PROGRESS_LINE_CHART_HEIGHT } from "@/components/progress/chartLayout";
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

type Props = {
  series: HourlyHealthChartPoint[];
  yLabel: string;
  formatValue: (value: number) => string;
  chartType?: "bar" | "line";
  allowDecimals?: boolean;
};

export default function HourlyHealthChart({
  series,
  yLabel,
  formatValue,
  chartType = "bar",
  allowDecimals = false,
}: Props) {
  const Chart = chartType === "line" ? LineChart : BarChart;
  const tooltipCursor =
    chartType === "line" ? PROGRESS_LINE_CURSOR : PROGRESS_BAR_CURSOR;

  return (
    <div className="w-full rounded-xl border border-border bg-surface p-2 py-3">
      <ResponsiveContainer
        width="100%"
        height={PROGRESS_LINE_CHART_HEIGHT}
        minWidth={0}
      >
        <Chart data={series} margin={PROGRESS_CHART_MARGIN.legend}>
          <CartesianGrid {...PROGRESS_CARTESIAN_GRID} />
          <XAxis
            dataKey="xLabel"
            tick={PROGRESS_AXIS_TICK}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            width={48}
            tick={PROGRESS_AXIS_TICK}
            tickLine={false}
            axisLine={false}
            allowDecimals={allowDecimals}
            label={progressYAxisLabel(yLabel, 4)}
          />
          <Tooltip
            cursor={tooltipCursor}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as
                | HourlyHealthChartPoint
                | undefined;
              if (!point) return null;
              return (
                <div
                  className={PROGRESS_TOOLTIP_PANEL_CLASS}
                  style={PROGRESS_TOOLTIP_CONTENT_STYLE}
                >
                  <p className="font-semibold text-foreground">{point.xLabel}</p>
                  <p className="mt-1 text-muted">{formatValue(point.value)}</p>
                </div>
              );
            }}
          />
          {chartType === "line" ? (
            <Line
              type="monotone"
              dataKey="value"
              name={yLabel}
              {...PROGRESS_LINE_STROKE}
              dot={progressLineDot()}
              activeDot={progressLineActiveDot()}
              connectNulls={false}
            />
          ) : (
            <Bar
              dataKey="value"
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
  );
}
