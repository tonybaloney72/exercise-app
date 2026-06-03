"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  BarChart,
  Cell,
} from "recharts";
import type { WorkoutLog } from "@/types";
import {
  buildCardioChartSeries,
  cardioExerciseTitle,
  formatPacePerMile,
  type CardioChartPoint,
} from "@/utils/cardioProgressStats";
import { formatSecondsToMMSS } from "@/utils/time";
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
  exerciseId: string;
  title?: string;
}

function CardioTooltipBody({ point }: { point: CardioChartPoint }) {
  const dist =
    point.distanceMi != null && point.distanceMi > 0
      ? `${point.distanceMi} mi`
      : null;
  const time =
    point.durationSec != null && point.durationSec > 0
      ? formatSecondsToMMSS(point.durationSec)
      : null;
  const pace = formatPacePerMile(point.paceSecondsPerMile);
  const paceLine = pace !== "—" ? `Pace: ${pace}` : null;

  return (
    <div className="rounded-lg border border-border px-3 py-2 text-xs shadow-lg" style={tooltipStyle}>
      <p className="font-semibold text-foreground">{point.date}</p>
      {dist && <p className="mt-1 text-muted">Distance: {dist}</p>}
      {time && <p className="text-muted">Time: {time}</p>}
      {paceLine && <p className="text-muted">{paceLine}</p>}
      {!dist && !time && <p className="text-muted">No metrics logged</p>}
    </div>
  );
}

function ChartShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted mt-0.5">{subtitle}</p>
      </div>
      <div className="h-56 w-full rounded-xl border border-border bg-surface p-2 pt-3">
        {children}
      </div>
    </div>
  );
}

export default function CardioProgressChart({
  history,
  exerciseId,
  title,
}: Props) {
  const activityTitle = title ?? cardioExerciseTitle(exerciseId);
  const series = useMemo(
    () => buildCardioChartSeries(history, exerciseId),
    [history, exerciseId],
  );
  const hasDistance = useMemo(
    () => series.some((p) => p.distanceMi != null && p.distanceMi > 0),
    [series],
  );
  const hasDuration = useMemo(
    () => series.some((p) => p.durationSec != null && p.durationSec > 0),
    [series],
  );

  const composedData = useMemo(
    () =>
      series.map((p) => ({
        ...p,
        distancePlot: p.distanceMi != null && p.distanceMi > 0 ? p.distanceMi : 0,
        durationPlot: p.durationMin != null ? p.durationMin : undefined,
      })),
    [series],
  );

  if (series.length === 0) {
    return null;
  }

  const sharedTooltip = (
    <Tooltip
      cursor={{ fill: "var(--surface-hover)" }}
      content={({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const p = payload[0]?.payload as CardioChartPoint | undefined;
        if (!p) return null;
        return <CardioTooltipBody point={p} />;
      }}
    />
  );

  if (hasDistance && hasDuration) {
    return (
      <ChartShell
        title={activityTitle}
        subtitle="Distance (bars) and session time (line). Tooltip shows pace per mile when both are logged."
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={composedData} margin={{ top: 28, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="var(--border-color)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="xLabel" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="mi"
              width={40}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              allowDecimals
              label={{
                value: "mi",
                angle: -90,
                position: "insideLeft",
                fill: "var(--muted)",
                fontSize: 10,
                offset: 4,
              }}
            />
            <YAxis
              yAxisId="min"
              orientation="right"
              width={36}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              allowDecimals
              label={{
                value: "min",
                angle: 90,
                position: "insideRight",
                fill: "var(--muted)",
                fontSize: 10,
                offset: 4,
              }}
            />
            {sharedTooltip}
            <Legend
              verticalAlign="top"
              height={28}
              formatter={(value) => (
                <span className="text-xs text-muted">
                  {value === "distancePlot" ? "Distance (mi)" : value === "durationPlot" ? "Time (min)" : value}
                </span>
              )}
            />
            <Bar
              yAxisId="mi"
              dataKey="distancePlot"
              name="distancePlot"
              fill="var(--accent)"
              radius={[6, 6, 0, 0]}
              maxBarSize={36}
            >
              {composedData.map((entry, index) => (
                <Cell
                  key={`d-${index}`}
                  fill="var(--accent)"
                  fillOpacity={entry.distanceMi != null && entry.distanceMi > 0 ? 0.45 : 0}
                />
              ))}
            </Bar>
            <Line
              yAxisId="min"
              type="monotone"
              dataKey="durationPlot"
              name="durationPlot"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={{
                r: 3,
                fill: "var(--foreground)",
                stroke: "var(--background)",
                strokeWidth: 1,
              }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  if (hasDistance && !hasDuration) {
    return (
      <ChartShell
        title={activityTitle}
        subtitle={`Distance per completed session (log time as well to see pace).`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 28, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="var(--border-color)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="xLabel" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis
              width={40}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              allowDecimals
              label={{
                value: "Miles",
                angle: -90,
                position: "insideLeft",
                fill: "var(--muted)",
                fontSize: 10,
                offset: 4,
              }}
            />
            {sharedTooltip}
            <Legend
              verticalAlign="top"
              height={28}
              formatter={() => <span className="text-xs text-muted">Distance (mi)</span>}
            />
            <Bar
              dataKey="distanceMi"
              name="Distance"
              fill="var(--accent)"
              fillOpacity={0.55}
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title={activityTitle}
      subtitle="Session time per completed session (add distance to see pace per mile)."
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 28, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="var(--border-color)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="xLabel" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis
            width={44}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            allowDecimals
            label={{
              value: "Minutes",
              angle: -90,
              position: "insideLeft",
              fill: "var(--muted)",
              fontSize: 10,
              offset: 4,
            }}
          />
          {sharedTooltip}
          <Legend
            verticalAlign="top"
            height={28}
            formatter={() => <span className="text-xs text-muted">Time (min)</span>}
          />
          <Line
            type="monotone"
            dataKey="durationMin"
            name="Time"
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
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
