"use client";

import { useMemo, type ReactNode } from "react";
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
  formatSpeedMph,
  type CardioChartPoint,
} from "@/utils/cardioProgressStats";
import { formatSecondsToMMSS } from "@/utils/time";
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
  history: WorkoutLog[];
  exerciseId: string;
  title?: string;
  /** Page provides the activity title (e.g. `/health/exercises/[kind]`). */
  hideHeader?: boolean;
}

function CardioTooltipBody({
  point,
  exerciseLabel,
}: {
  point: CardioChartPoint;
  exerciseLabel: string;
}) {
  const dist =
    point.distanceMi != null && point.distanceMi > 0
      ? `${point.distanceMi} mi`
      : null;
  const time =
    point.durationSec != null && point.durationSec > 0
      ? formatSecondsToMMSS(point.durationSec)
      : null;
  const pace = formatPacePerMile(point.paceSecondsPerMile);
  const paceLine = pace !== "-" ? `Pace: ${pace}` : null;
  const speed = formatSpeedMph(point.speedMph);
  const speedLine = speed !== "-" ? `Speed: ${speed}` : null;
  const steps =
    point.stepCount != null && point.stepCount > 0
      ? point.stepCount.toLocaleString()
      : null;
  const kcal =
    point.activeCaloriesKcal != null && point.activeCaloriesKcal > 0
      ? Math.round(point.activeCaloriesKcal).toLocaleString()
      : null;
  const hr =
    point.avgHeartRateBpm != null && point.avgHeartRateBpm > 0
      ? Math.round(point.avgHeartRateBpm).toLocaleString()
      : null;

  return (
    <div
      className={PROGRESS_TOOLTIP_PANEL_CLASS}
      style={PROGRESS_TOOLTIP_CONTENT_STYLE}
    >
      <p className="font-semibold text-foreground">
        {point.date}
        {point.sessionIndex != null
          ? ` · ${exerciseLabel} ${point.sessionIndex}`
          : ""}
      </p>
      {dist && <p className="mt-1 text-muted">Distance: {dist}</p>}
      {time && <p className="text-muted">Time: {time}</p>}
      {paceLine && <p className="text-muted">{paceLine}</p>}
      {speedLine && <p className="text-muted">{speedLine}</p>}
      {steps && <p className="text-muted">Steps: {steps}</p>}
      {kcal && <p className="text-muted">Active kcal: {kcal}</p>}
      {hr && <p className="text-muted">Avg HR: {hr} bpm</p>}
      {!dist && !time && !steps && !kcal && !hr && (
        <p className="text-muted">No metrics logged</p>
      )}
    </div>
  );
}

function ChartShell({
  title,
  subtitle,
  hideHeader = false,
  children,
}: {
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {!hideHeader && title ? (
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-muted mt-0.5">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <div className="w-full rounded-xl border border-border bg-surface p-2 py-3">
        {children}
      </div>
    </div>
  );
}

export default function CardioProgressChart({
  history,
  exerciseId,
  title,
  hideHeader = false,
}: Props) {
  const activityTitle = title ?? cardioExerciseTitle(exerciseId);
  const exerciseLabel = cardioExerciseTitle(exerciseId);
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
        distancePlot:
          p.distanceMi != null && p.distanceMi > 0 ? p.distanceMi : 0,
        durationPlot: p.durationMin != null ? p.durationMin : undefined,
      })),
    [series],
  );

  if (series.length === 0) {
    if (hideHeader) {
      return (
        <div className="w-full rounded-xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center">
          <p className="text-sm text-muted">No sessions in this range.</p>
        </div>
      );
    }
    return null;
  }

  const barTooltip = (
    <Tooltip
      cursor={PROGRESS_BAR_CURSOR}
      content={({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const p = payload[0]?.payload as CardioChartPoint | undefined;
        if (!p) return null;
        return <CardioTooltipBody point={p} exerciseLabel={exerciseLabel} />;
      }}
    />
  );

  const lineTooltip = (
    <Tooltip
      cursor={PROGRESS_LINE_CURSOR}
      content={({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const p = payload[0]?.payload as CardioChartPoint | undefined;
        if (!p) return null;
        return <CardioTooltipBody point={p} exerciseLabel={exerciseLabel} />;
      }}
    />
  );

  if (hasDistance && hasDuration) {
    return (
      <ChartShell hideHeader={hideHeader}>
        <ResponsiveContainer
          width="100%"
          height={PROGRESS_LINE_CHART_HEIGHT}
          minWidth={0}
        >
          <ComposedChart
            data={composedData}
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
              yAxisId="mi"
              width={40}
              tick={PROGRESS_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              allowDecimals
              label={progressYAxisLabel("mi", 4)}
            />
            <YAxis
              yAxisId="min"
              orientation="right"
              width={36}
              tick={PROGRESS_AXIS_TICK}
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
            {barTooltip}
            <Legend
              verticalAlign="top"
              height={28}
              formatter={(value) => (
                <span className="text-xs text-muted">
                  {value === "distancePlot"
                    ? "Distance (mi)"
                    : value === "durationPlot"
                      ? "Time (min)"
                      : value}
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
                  fillOpacity={
                    entry.distanceMi != null && entry.distanceMi > 0 ? 0.45 : 0
                  }
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
              dot={progressLineDot("var(--foreground)")}
              activeDot={progressLineActiveDot("var(--foreground)")}
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
        hideHeader={hideHeader}
        title={activityTitle}
        subtitle="Distance per completed session. Tap a session for pace, speed, and Health Connect metrics when logged."
      >
        <ResponsiveContainer
          width="100%"
          height={PROGRESS_LINE_CHART_HEIGHT}
          minWidth={0}
        >
          <BarChart data={series} margin={PROGRESS_CHART_MARGIN.legend}>
            <CartesianGrid {...PROGRESS_CARTESIAN_GRID} />
            <XAxis
              dataKey="xLabel"
              tick={PROGRESS_AXIS_TICK}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={40}
              tick={PROGRESS_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              allowDecimals
              label={progressYAxisLabel("Miles", 4)}
            />
            {barTooltip}
            <Legend
              verticalAlign="top"
              height={28}
              formatter={() => (
                <span className="text-xs text-muted">Distance (mi)</span>
              )}
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
      hideHeader={hideHeader}
      title={activityTitle}
      subtitle="Session time per completed session. Tap a session for Health Connect metrics when logged."
    >
      <ResponsiveContainer
        width="100%"
        height={PROGRESS_LINE_CHART_HEIGHT}
        minWidth={0}
      >
        <LineChart data={series} margin={PROGRESS_CHART_MARGIN.legend}>
          <CartesianGrid {...PROGRESS_CARTESIAN_GRID} />
          <XAxis
            dataKey="xLabel"
            tick={PROGRESS_AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            width={44}
            tick={PROGRESS_AXIS_TICK}
            tickLine={false}
            axisLine={false}
            allowDecimals
            label={progressYAxisLabel("Minutes", 4)}
          />
          {lineTooltip}
          <Legend
            verticalAlign="top"
            height={28}
            formatter={() => (
              <span className="text-xs text-muted">Time (min)</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="durationMin"
            name="Time"
            {...PROGRESS_LINE_STROKE}
            dot={progressLineDot()}
            activeDot={progressLineActiveDot()}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
