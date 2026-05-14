"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { WorkoutLog } from "@/types";
import { CATEGORIES } from "@/data/categories";
import { weeklyWorkoutCounts, trainingCategoryTotals } from "@/utils/progressStats";

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

export default function ProgressChartsSection({ history }: Props) {
  const weekly = useMemo(() => weeklyWorkoutCounts(history, 8), [history]);
  const categoryData = useMemo(() => {
    const rows = trainingCategoryTotals(history);
    return rows.map((r) => ({
      ...r,
      name: CATEGORIES[r.category].shortName,
      fill: CATEGORIES[r.category].color,
    }));
  }, [history]);

  const hasWorkouts = history.length > 0;
  const hasCategoryData = categoryData.length > 0;

  if (!hasWorkouts) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Workouts per week</h2>
        <p className="text-xs text-muted mt-0.5">
          Sunday–Saturday weeks; label is the week&apos;s start date
        </p>
        <div className="mt-3 h-56 w-full rounded-xl border border-border bg-surface p-2 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid
                stroke="var(--border-color)"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                allowDecimals={false}
                width={36}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-hover)" }}
                contentStyle={tooltipStyle}
                formatter={(value) => [`${Number(value ?? 0)}`, "Workouts"]}
                labelFormatter={(label) => `Week of ${label}`}
              />
              <Bar
                dataKey="count"
                name="Workouts"
                fill="var(--accent)"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground">Training focus</h2>
        <p className="text-xs text-muted mt-0.5">
          Completed strength exercises by category (stretches excluded)
        </p>
        {hasCategoryData ? (
          <div className="mt-3 w-full overflow-hidden rounded-xl border border-border bg-surface">
            <div className="h-[220px] w-full px-4 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={44}
                    outerRadius={68}
                    paddingAngle={2}
                  >
                    {categoryData.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={entry.fill}
                        stroke="var(--background)"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, item) => {
                      const v = Number(value ?? 0);
                      const total = categoryData.reduce((s, d) => s + d.value, 0);
                      const pct = total ? Math.round((v / total) * 100) : 0;
                      const label =
                        item && "payload" in item && item.payload && typeof item.payload === "object"
                          ? (item.payload as { name?: string }).name
                          : undefined;
                      return [`${v} (${pct}%)`, label ?? "Sets"];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul
              className="flex flex-wrap justify-center gap-x-4 gap-y-2.5 px-4 pb-4 pt-1"
              aria-label="Category legend"
            >
              {categoryData.map((entry) => (
                <li
                  key={entry.category}
                  className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: entry.fill }}
                    aria-hidden
                  />
                  {entry.name}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center">
            <p className="text-xs text-muted">
              No logged strength sets yet — finish round exercises to see this chart.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
