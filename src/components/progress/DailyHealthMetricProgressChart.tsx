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
  Legend,
} from "recharts";
import type { DailyHealthMetricChartPoint } from "@/lib/health/dailyHealthChart";
import type { DailyHealthUnavailableReason } from "@/hooks/useDailyHealthFromHealth";
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

interface Props {
  title: string;
  subtitle: string;
  series: DailyHealthMetricChartPoint[];
  yLabel: string;
  emptyDetail: string;
  formatValue: (value: number) => string;
  loading?: boolean;
  unavailableReason?: DailyHealthUnavailableReason | null;
  chartType?: "bar" | "line";
  allowDecimals?: boolean;
  /** Page provides title + range switcher. */
  hideHeader?: boolean;
}

function unavailableCopy(reason: DailyHealthUnavailableReason): string {
  if (reason === "web") {
    return "Daily health totals sync from Health Connect in the Android app.";
  }
  return "Connect Health Connect in Settings to see daily health totals.";
}

export default function DailyHealthMetricProgressChart({
  title,
  subtitle,
  series,
  yLabel,
  emptyDetail,
  formatValue,
  loading,
  unavailableReason,
  chartType = "bar",
  allowDecimals = false,
  hideHeader = false,
}: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {!hideHeader ? (
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted mt-0.5">Loading from Health Connect…</p>
          </div>
        ) : (
          <p className="text-xs text-muted">Loading from Health Connect…</p>
        )}
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {!hideHeader ? (
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted mt-0.5">{subtitle}</p>
          </div>
        ) : null}
        <div className="w-full rounded-xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center">
          <p className="text-sm text-muted">
            {unavailableReason
              ? unavailableCopy(unavailableReason)
              : emptyDetail}
          </p>
        </div>
      </div>
    );
  }

  const Chart = chartType === "line" ? LineChart : BarChart;
  const tooltipCursor =
    chartType === "line" ? PROGRESS_LINE_CURSOR : PROGRESS_BAR_CURSOR;

  return (
    <div className="flex flex-col gap-3">
      {!hideHeader ? (
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted mt-0.5">{subtitle}</p>
        </div>
      ) : null}
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
                const p = payload[0]?.payload as
                  | DailyHealthMetricChartPoint
                  | undefined;
                if (!p) return null;
                return (
                  <div
                    className={PROGRESS_TOOLTIP_PANEL_CLASS}
                    style={PROGRESS_TOOLTIP_CONTENT_STYLE}
                  >
                    <p className="font-semibold text-foreground">{p.date}</p>
                    <p className="mt-1 text-muted">{formatValue(p.value)}</p>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              height={28}
              formatter={() => (
                <span className="text-xs text-muted">{yLabel}</span>
              )}
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
    </div>
  );
}
