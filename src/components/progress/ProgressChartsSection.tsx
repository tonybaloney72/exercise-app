"use client";

import { useMemo, useRef } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { WorkoutLog } from "@/types";
import { CATEGORIES } from "@/core/catalog";
import { trainingCategoryTotals } from "@/utils/progressStats";
import EmptyState from "@/components/common/EmptyState";
import SurfaceCard from "@/components/common/SurfaceCard";
import { PROGRESS_PIE_CHART_HEIGHT } from "@/components/progress/chartLayout";
import { PROGRESS_TOOLTIP_CONTENT_STYLE } from "@/components/progress/rechartsProgressDefaults";

interface Props {
  history: WorkoutLog[];
}

export default function ProgressChartsSection({ history }: Props) {
  const categoryChartRef = useRef<HTMLDivElement>(null);
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
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            Training focus
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Completed strength exercises by category (stretches excluded)
          </p>
        </div>
      </div>
      {hasCategoryData ? (
        <SurfaceCard
          ref={categoryChartRef}
          className="mt-3 w-full overflow-hidden p-0"
        >
          <div className="w-full px-4 py-4">
            <ResponsiveContainer
              width="100%"
              height={PROGRESS_PIE_CHART_HEIGHT}
              minWidth={0}
            >
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
                  contentStyle={PROGRESS_TOOLTIP_CONTENT_STYLE}
                  formatter={(value, _name, item) => {
                    const v = Number(value ?? 0);
                    const total = categoryData.reduce((s, d) => s + d.value, 0);
                    const pct = total ? Math.round((v / total) * 100) : 0;
                    const label =
                      item &&
                      "payload" in item &&
                      item.payload &&
                      typeof item.payload === "object"
                        ? (item.payload as { name?: string }).name
                        : undefined;
                    return [`${v} (${pct}%)`, label ?? "Sets"];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul
            className="flex flex-wrap justify-center gap-x-4 gap-y-2.5 px-4 pb-4 py-1"
            aria-label="Category legend"
          >
            {categoryData.map((entry) => (
              <li
                key={entry.category}
                className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted"
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
        </SurfaceCard>
      ) : (
        <SurfaceCard className="mt-3 border-dashed bg-surface/50 px-4 py-8">
          <EmptyState
            title="No logged strength sets yet - finish round exercises to see this chart."
            className="text-xs"
          />
        </SurfaceCard>
      )}
    </div>
  );
}
