"use client";

import { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { WorkoutLog } from "@/types";
import { resolveExerciseDisplayName } from "@/lib/exerciseDisplayName";
import {
  buildExerciseProgressSeries,
  exerciseProgressTooltipLines,
  formatExerciseProgressSetsCell,
  listExercisesWithNumericProgress,
  type ExerciseProgressPoint,
} from "@/utils/exerciseProgressStats";
import { formatSecondsToMMSS } from "@/utils/time";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import EmptyState from "@/components/common/EmptyState";
import SurfaceCard from "@/components/common/SurfaceCard";
const tooltipStyle = {
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

export default function ExerciseProgressChart({ history }: Props) {
  const options = useMemo(
    () => listExercisesWithNumericProgress(history),
    [history],
  );
  const [picked, setPicked] = useState("");

  const exerciseId = useMemo(() => {
    if (options.length === 0) return "";
    if (picked && options.some((o) => o.id === picked)) return picked;
    return options[0]!.id;
  }, [options, picked]);

  const series = useMemo(
    () => (exerciseId ? buildExerciseProgressSeries(history, exerciseId) : []),
    [history, exerciseId],
  );

  const axisMode = series[0]?.mode ?? "reps";
  const yLabel = axisMode === "duration" ? "Time (sec)" : "Reps";

  const exerciseName = useMemo(
    () =>
      options.find((o) => o.id === exerciseId)?.name ??
      resolveExerciseDisplayName(exerciseId),
    [options, exerciseId],
  );

  const [sessionsOpen, setSessionsOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Exercise over time
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Total reps or time per day; hover a point or open Sessions to see how
          many sets you logged
        </p>
      </div>

      <div className="flex gap-2">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">Choose exercise</span>
          <select
            value={exerciseId}
            onChange={(e) => {
              setSessionsOpen(false);
              setPicked(e.target.value);
            }}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-accent"
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setSessionsOpen(true)}
          disabled={series.length === 0}
          className="shrink-0 rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-border/40 focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sessions
        </button>
      </div>

      <BottomSheetModal
        open={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
        title={exerciseName}
        maxWidth="lg"
        panelClassName="max-h-[min(85dvh,560px)] sm:max-h-[min(85dvh,560px)]"
        bodyClassName="overflow-y-auto overscroll-contain px-2 pb-3"
        headerExtra={
          <p className="shrink-0 border-b border-border px-4 py-2 text-sm leading-snug text-muted">
            One row per workout. <span className="text-foreground">Sets</span>{" "}
            lists each logged set; reps and time columns are day totals. The
            line chart uses total time for time-based exercises when duration
            was logged; otherwise total reps.
          </p>
        }
      >
        {series.length === 0 ? (
          <EmptyState
            title="No sessions to list."
            className="px-2 py-6 text-xs"
          />
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Sets</th>
                <th className="px-2 py-2 font-medium">Reps (total)</th>
                <th className="px-2 py-2 font-medium">Time (total)</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((row) => (
                <tr
                  key={row.date}
                  className="border-b border-border/80 last:border-0"
                >
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-foreground">
                    {row.date}
                  </td>
                  <td className="px-2 py-2 text-foreground">
                    {formatExerciseProgressSetsCell(row)}
                  </td>
                  <td className="px-2 py-2 tabular-nums text-foreground">
                    {row.reps > 0 ? row.reps : "-"}
                  </td>
                  <td className="px-2 py-2 tabular-nums text-foreground">
                    {row.durationSec > 0
                      ? formatSecondsToMMSS(row.durationSec) ||
                        `${row.durationSec}s`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </BottomSheetModal>

      <SurfaceCard ref={chartRef} className="h-56 w-full p-2 pt-3">
        {series.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4">
            <EmptyState
              title="No chartable sessions for this exercise yet (log reps or duration when you complete sets)."
              className="text-xs"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
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
                width={40}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                allowDecimals={axisMode === "duration"}
                domain={[0, "auto"]}
                label={{
                  value: yLabel,
                  angle: -90,
                  position: "insideLeft",
                  fill: "var(--muted)",
                  fontSize: 10,
                  offset: 0,
                }}
                tickFormatter={(v) => {
                  if (axisMode !== "duration" || typeof v !== "number")
                    return String(v);
                  if (v >= 60) return `${Math.floor(v / 60)}m`;
                  return `${v}s`;
                }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as
                    | { date?: string; xLabel?: string }
                    | undefined;
                  if (row?.date) return row.date;
                  return row?.xLabel ?? "";
                }}
                formatter={(value, _name, item) => {
                  const p = item?.payload as ExerciseProgressPoint | undefined;
                  if (!p) return [String(value ?? 0), ""];
                  const { primary, secondary } = exerciseProgressTooltipLines(
                    p,
                    Number(value ?? 0),
                  );
                  return [primary, secondary];
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={yLabel}
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{
                  r: 3,
                  fill: "var(--accent)",
                  stroke: "var(--background)",
                  strokeWidth: 1,
                }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SurfaceCard>
    </div>
  );
}
