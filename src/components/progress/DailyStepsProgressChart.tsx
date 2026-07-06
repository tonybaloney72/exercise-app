"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { DailyStepsChartPoint } from "@/lib/health/dailyStepsChart";
import type { DailyHealthUnavailableReason } from "@/hooks/useDailyHealthFromHealth";
import { PROGRESS_LINE_CHART_HEIGHT } from "@/components/progress/chartLayout";
import {
  PROGRESS_AXIS_TICK,
  PROGRESS_BAR_CURSOR,
  PROGRESS_CARTESIAN_GRID,
  PROGRESS_CHART_MARGIN,
  PROGRESS_TOOLTIP_CONTENT_STYLE,
  PROGRESS_TOOLTIP_PANEL_CLASS,
  progressYAxisLabel,
} from "@/components/progress/rechartsProgressDefaults";

interface Props {
  series: DailyStepsChartPoint[];
  loading?: boolean;
  unavailableReason?: DailyHealthUnavailableReason | null;
  hideHeader?: boolean;
}

function unavailableCopy(reason: DailyHealthUnavailableReason): string {
  if (reason === "web") {
    return "Daily step totals sync from Health Connect in the Android app.";
  }
  return "Connect Health Connect in Settings to see daily step totals.";
}

export default function DailyStepsProgressChart({
  series,
  loading,
  unavailableReason,
  hideHeader = false,
}: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {!hideHeader ? (
          <div>
            <h2 className="text-sm font-semibold text-foreground">Daily steps</h2>
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
            <h2 className="text-sm font-semibold text-foreground">Daily steps</h2>
            <p className="text-xs text-muted mt-0.5">
              Total steps per calendar day from Health Connect (today through midnight
              so far).
            </p>
          </div>
        ) : null}
        <div className="w-full rounded-xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center">
          <p className="text-sm text-muted">
            {unavailableReason
              ? unavailableCopy(unavailableReason)
              : "No step data for this range yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!hideHeader ? (
        <div>
          <h2 className="text-sm font-semibold text-foreground">Daily steps</h2>
          <p className="text-xs text-muted mt-0.5">
            Total steps per calendar day from Health Connect (today through midnight so far).
          </p>
        </div>
      ) : null}
      <div className="w-full rounded-xl border border-border bg-surface p-2 py-3">
        <ResponsiveContainer
          width="100%"
          height={PROGRESS_LINE_CHART_HEIGHT}
          minWidth={0}
        >
          <BarChart
            data={series}
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
              allowDecimals={false}
              label={progressYAxisLabel("Steps", 4)}
            />
            <Tooltip
              cursor={PROGRESS_BAR_CURSOR}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload as DailyStepsChartPoint | undefined;
                if (!p) return null;
                return (
                  <div
                    className={PROGRESS_TOOLTIP_PANEL_CLASS}
                    style={PROGRESS_TOOLTIP_CONTENT_STYLE}
                  >
                    <p className="font-semibold text-foreground">{p.date}</p>
                    <p className="mt-1 text-muted">
                      {p.stepCount.toLocaleString()} steps
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              height={28}
              formatter={() => (
                <span className="text-xs text-muted">Steps</span>
              )}
            />
            <Bar
              dataKey="stepCount"
              name="Steps"
              fill="var(--accent)"
              fillOpacity={0.55}
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
