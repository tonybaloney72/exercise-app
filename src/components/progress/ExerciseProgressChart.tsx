"use client";

import { useMemo, useState } from "react";
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
import {
  buildExerciseProgressSeries,
  listExercisesWithNumericProgress,
} from "@/utils/exerciseProgressStats";
import { formatSecondsToMMSS } from "@/utils/time";

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
  const options = useMemo(() => listExercisesWithNumericProgress(history), [history]);
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

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Exercise over time</h2>
        <p className="text-xs text-muted mt-0.5">
          Reps or logged duration per workout (summed if the exercise appears in multiple rounds)
        </p>
      </div>

      <label className="block">
        <span className="sr-only">Choose exercise</span>
        <select
          value={exerciseId}
          onChange={(e) => setPicked(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-accent"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>

      <div className="h-56 w-full rounded-xl border border-border bg-surface p-2 pt-3">
        {series.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4">
            <p className="text-center text-xs text-muted">
              No chartable sessions for this exercise yet (log reps or duration when you complete
              sets).
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
              <CartesianGrid
                stroke="var(--border-color)"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis dataKey="xLabel" tick={axisTick} tickLine={false} axisLine={false} />
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
                  if (axisMode !== "duration" || typeof v !== "number") return String(v);
                  if (v >= 60) return `${Math.floor(v / 60)}m`;
                  return `${v}s`;
                }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as { date?: string; xLabel?: string } | undefined;
                  if (row?.date) return row.date;
                  return row?.xLabel ?? "";
                }}
                formatter={(value, _name, item) => {
                  const p = item?.payload as
                    | {
                        mode?: string;
                        reps?: number;
                        durationSec?: number;
                      }
                    | undefined;
                  const v = Number(value ?? 0);
                  if (p?.mode === "duration") {
                    const line = `${formatSecondsToMMSS(v) || `${v}s`} total`;
                    if (p.reps && p.reps > 0) return [line, `Also ${p.reps} reps logged`];
                    return [line, "Duration"];
                  }
                  const line = `${v} reps`;
                  if (p?.durationSec && p.durationSec > 0) {
                    return [
                      line,
                      `${formatSecondsToMMSS(p.durationSec) || `${p.durationSec}s`} logged`,
                    ];
                  }
                  return [line, "Reps"];
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
      </div>
    </div>
  );
}
