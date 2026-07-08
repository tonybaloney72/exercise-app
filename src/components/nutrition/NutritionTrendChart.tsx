"use client";

import { useMemo, useState } from "react";
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
import type { DailyHealthMetricChartPoint } from "@/lib/health/dailyHealthChart";
import type { DailyHealthUnavailableReason } from "@/hooks/useDailyHealthFromHealth";
import type { FoodDiaryDay } from "@/lib/fatsecret/foodDiary";
import type { HealthRangePresetId } from "@/lib/health/healthRangePresets";
import {
  MAX_NUTRITION_DIARY_DAYS,
  NUTRITION_TREND_METRICS,
  buildNutritionTrendPoints,
  chartDateKeysForNutritionTrend,
  consumedValueForMetric,
  formatNutritionTrendValue,
  nutritionTrendHasData,
  type NutritionTrendMetricId,
  type NutritionTrendPoint,
} from "@/lib/nutrition/nutritionTrendChart";
import { uiChoicePillSolidClass } from "@/lib/uiClasses";
import { PROGRESS_LINE_CHART_HEIGHT } from "@/components/progress/chartLayout";
import {
  PROGRESS_AXIS_TICK,
  PROGRESS_BAR_CURSOR,
  PROGRESS_CARTESIAN_GRID,
  PROGRESS_CHART_MARGIN,
  PROGRESS_TOOLTIP_CONTENT_STYLE,
  PROGRESS_TOOLTIP_PANEL_CLASS,
} from "@/components/progress/rechartsProgressDefaults";

type Props = {
  range: HealthRangePresetId;
  burnedSeries: DailyHealthMetricChartPoint[];
  dateKeys: string[];
  diaryByDate: Map<string, FoodDiaryDay>;
  diaryLoading?: boolean;
  canLoadDiary: boolean;
  healthLoading?: boolean;
  unavailableReason?: DailyHealthUnavailableReason | null;
};

export default function NutritionTrendChart({
  range,
  burnedSeries,
  dateKeys,
  diaryByDate,
  diaryLoading,
  canLoadDiary,
  healthLoading,
  unavailableReason,
}: Props) {
  const [metric, setMetric] = useState<NutritionTrendMetricId>("calories");

  const points = useMemo(
    () =>
      buildNutritionTrendPoints({
        dateKeys,
        burnedSeries,
        diaryByDate,
      }),
    [dateKeys, burnedSeries, diaryByDate],
  );

  const chartData = useMemo(
    () =>
      points.map((point) => ({
        ...point,
        burned: point.burned ?? 0,
        consumed: consumedValueForMetric(point, metric) ?? 0,
      })),
    [points, metric],
  );

  const loading = Boolean(healthLoading) || (canLoadDiary && Boolean(diaryLoading));
  const hasData = nutritionTrendHasData(points, metric);
  const showBurned = metric === "calories";
  const metricMeta = NUTRITION_TREND_METRICS.find((row) => row.id === metric)!;
  const integerYAxis = metric === "calories" || metric === "sodium";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Daily trends</h2>
        <p className="text-xs text-muted">
          {showBurned
            ? "Burned from Health Connect vs consumed from your meal log."
            : `Consumed ${metricMeta.label.toLowerCase()} from your meal log.`}
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Nutrition metric">
          {NUTRITION_TREND_METRICS.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setMetric(row.id)}
              className={uiChoicePillSolidClass(metric === row.id)}
            >
              {row.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted">Loading chart…</p>
      ) : !hasData ? (
        <div className="w-full rounded-xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center">
          <p className="text-sm text-muted">
            {unavailableReason && metric === "calories" && burnedSeries.length === 0
              ? "Connect Health Connect to see burned calories, or log food to see consumed totals."
              : canLoadDiary
                ? "No data in this range yet. Log food or sync Health Connect."
                : "Sign in and log food to see consumed totals."}
          </p>
        </div>
      ) : (
        <div className="w-full rounded-xl border border-border bg-surface p-2 py-3">
          <ResponsiveContainer
            width="100%"
            height={PROGRESS_LINE_CHART_HEIGHT}
            minWidth={0}
          >
            <BarChart data={chartData} margin={PROGRESS_CHART_MARGIN.legend}>
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
                allowDecimals={!integerYAxis}
              />
              <Tooltip
                cursor={PROGRESS_BAR_CURSOR}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as NutritionTrendPoint | undefined;
                  if (!point) return null;
                  const consumed = consumedValueForMetric(point, metric);
                  return (
                    <div
                      className={PROGRESS_TOOLTIP_PANEL_CLASS}
                      style={PROGRESS_TOOLTIP_CONTENT_STYLE}
                    >
                      <p className="font-semibold text-foreground">{point.date}</p>
                      {showBurned && point.burned != null && point.burned > 0 ? (
                        <p className="mt-1 text-muted">
                          Burned: {formatNutritionTrendValue(point.burned, "calories")}
                        </p>
                      ) : null}
                      {consumed != null && consumed > 0 ? (
                        <p className="mt-0.5 text-muted">
                          Consumed: {formatNutritionTrendValue(consumed, metric)}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Legend verticalAlign="top" height={28} />
              {showBurned ? (
                <Bar
                  dataKey="burned"
                  name="Burned"
                  fill="var(--muted)"
                  fillOpacity={0.45}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              ) : null}
              <Bar
                dataKey="consumed"
                name="Consumed"
                fill="var(--accent)"
                fillOpacity={0.65}
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {!canLoadDiary && range !== "today" ? (
        <p className="text-xs text-muted">
          Consumed history requires a signed-in account. Burned calories still sync from
          Health Connect.
        </p>
      ) : null}
      {canLoadDiary && (range === "year" || range === "all") ? (
        <p className="text-xs text-muted">
          Meal log history loads up to the last {MAX_NUTRITION_DIARY_DAYS} days in this view.
        </p>
      ) : null}
    </div>
  );
}
