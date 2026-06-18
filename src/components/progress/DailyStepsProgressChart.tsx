"use client";

import type { CSSProperties } from "react";
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
import { PROGRESS_LINE_CHART_HEIGHT } from "@/components/progress/chartLayout";

const tooltipStyle: CSSProperties = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border-color)",
  borderRadius: 10,
  color: "var(--foreground)",
  fontSize: 12,
};

const axisTick = { fill: "var(--muted)", fontSize: 11 };

interface Props {
  series: DailyStepsChartPoint[];
  loading?: boolean;
}

export default function DailyStepsProgressChart({ series, loading }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Daily steps</h2>
          <p className="text-xs text-muted mt-0.5">Loading from Health Connect…</p>
        </div>
      </div>
    );
  }

  if (series.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Daily steps</h2>
        <p className="text-xs text-muted mt-0.5">
          Total steps per calendar day from Health Connect (today through midnight so far).
        </p>
      </div>
      <div className="w-full rounded-xl border border-border bg-surface p-2 py-3">
        <ResponsiveContainer
          width="100%"
          height={PROGRESS_LINE_CHART_HEIGHT}
          minWidth={0}
        >
          <BarChart
            data={series}
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
              allowDecimals={false}
              label={{
                value: "Steps",
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
                const p = payload[0]?.payload as DailyStepsChartPoint | undefined;
                if (!p) return null;
                return (
                  <div
                    className="rounded-lg border border-border px-3 py-2 text-xs shadow-lg"
                    style={tooltipStyle}
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
