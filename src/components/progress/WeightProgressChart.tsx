"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { buildWeightChartSeries, formatWeightLb } from "@/lib/weightLog";
import { useSettingsStore } from "@/stores/useSettingsStore";
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
  const weightLog = useSettingsStore((s) => s.weightLog);
  const series = useMemo(() => buildWeightChartSeries(weightLog), [weightLog]);

  if (series.length === 0) {
    return (
      <div className="space-y-3">
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
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Body weight</h2>
        <p className="text-xs text-muted mt-0.5">
          Small steps add up. Keep logging and trust the trend.
        </p>
      </div>
      <SurfaceCard className="w-full p-2 pt-3">
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
              dataKey="xLabel"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
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
    </div>
  );
}
