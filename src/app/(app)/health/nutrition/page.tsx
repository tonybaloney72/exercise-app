"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BackNavLink from "@/components/common/BackNavLink";
import SurfaceCard from "@/components/common/SurfaceCard";
import HealthRangeSwitcher from "@/components/health/HealthRangeSwitcher";
import NutritionMacroSummary from "@/components/nutrition/NutritionMacroSummary";
import NutritionTotalsPanel from "@/components/nutrition/NutritionTotalsPanel";
import NutritionTrendChart from "@/components/nutrition/NutritionTrendChart";
import { useBodyBmr } from "@/hooks/useBodyBmr";
import { useDailyHealthFromHealth } from "@/hooks/useDailyHealthFromHealth";
import { useNutritionDiaryRange } from "@/hooks/useNutritionDiaryRange";
import { routes } from "@/lib/appRoutes";
import {
  HEALTH_RANGE_PRESETS,
  filterEntriesByHealthRange,
  type HealthRangePresetId,
} from "@/lib/health/healthRangePresets";
import { FATSECRET_MEAL_LABELS } from "@/lib/nutrition/fatsecretMeals";
import {
  chartDateKeysForNutritionTrend,
  sumConsumedForHealthRange,
} from "@/lib/nutrition/nutritionTrendChart";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

function rangeLabel(range: HealthRangePresetId, prefix: string): string {
  if (range === "today") return prefix;
  const preset = HEALTH_RANGE_PRESETS.find((row) => row.id === range);
  return `${prefix} (${preset?.label.toLowerCase() ?? range})`;
}

export default function HealthNutritionPage() {
  const dailyHealth = useDailyHealthFromHealth();
  const { profileComplete, bmrDaily, bmrSoFarToday, sumBmrForDateKeys } =
    useBodyBmr();
  const authMode = useAuthStore((s) => s.mode);
  const canLoadDiary = authMode === "authenticated";
  const healthLoading = dailyHealth.loading && dailyHealth.available;
  const [range, setRange] = useState<HealthRangePresetId>("today");

  const chartDateKeys = useMemo(
    () =>
      chartDateKeysForNutritionTrend({
        range,
        burnedSeries: dailyHealth.activeKcalChartSeries,
      }),
    [range, dailyHealth.activeKcalChartSeries],
  );

  const diaryRange = useNutritionDiaryRange(chartDateKeys, canLoadDiary);
  const consumedLoading = canLoadDiary && diaryRange.loading;

  const filteredBurned = useMemo(
    () => filterEntriesByHealthRange(dailyHealth.activeKcalChartSeries, range),
    [dailyHealth.activeKcalChartSeries, range],
  );

  const consumedTotals = useMemo(
    () => sumConsumedForHealthRange(range, diaryRange.byDate),
    [range, diaryRange.byDate],
  );

  const summaryActive = useMemo(() => {
    if (range === "today") {
      const value = dailyHealth.todayActiveKcal;
      return value != null ? Math.round(value) : null;
    }
    if (filteredBurned.length === 0) return null;
    return Math.round(filteredBurned.reduce((sum, row) => sum + row.value, 0));
  }, [range, dailyHealth.todayActiveKcal, filteredBurned]);

  const summaryPassive = useMemo(() => {
    if (!profileComplete) return null;
    if (range === "today") return bmrDaily;
    return sumBmrForDateKeys(chartDateKeys);
  }, [
    bmrDaily,
    chartDateKeys,
    profileComplete,
    range,
    sumBmrForDateKeys,
  ]);

  const summaryTotalBurned = useMemo(() => {
    if (summaryActive == null && summaryPassive == null) return null;
    return (summaryActive ?? 0) + (summaryPassive ?? 0);
  }, [summaryActive, summaryPassive]);

  const summaryConsumed = useMemo(() => {
    if (!canLoadDiary || consumedLoading) return null;
    if (consumedTotals.calories <= 0) return null;
    return Math.round(consumedTotals.calories);
  }, [canLoadDiary, consumedLoading, consumedTotals.calories]);

  const summaryNet = useMemo(() => {
    if (summaryConsumed == null || summaryTotalBurned == null) return null;
    return summaryConsumed - summaryTotalBurned;
  }, [summaryConsumed, summaryTotalBurned]);

  const totalsTitle = "Consumed totals";

  const todayDiary =
    range === "today" ? diaryRange.byDate.get(formatLocalDateKey()) : null;

  return (
    <div className="flex flex-col gap-3 py-6">
      <BackNavLink fallbackHref={routes.health} />
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-foreground">Nutrition</h1>
        <HealthRangeSwitcher value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SurfaceCard className="p-4">
          <p className="text-sm text-muted">
            {rangeLabel(range, "Passive (BMR)")}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {!profileComplete
              ? "-"
              : summaryPassive != null
                ? `${summaryPassive} kcal`
                : "-"}
          </p>
          {profileComplete ? (
            range === "today" && bmrSoFarToday != null && bmrDaily != null ? (
              <p className="mt-1 text-xs text-muted">
                ~{bmrSoFarToday} kcal so far today
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">Resting burn estimate</p>
            )
          ) : (
            <Link
              href={routes.settingsBody}
              className="mt-1 inline-block text-xs font-medium text-accent hover:underline"
            >
              Set up body profile
            </Link>
          )}
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-sm text-muted">{rangeLabel(range, "Active")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {healthLoading
              ? "…"
              : summaryActive != null
                ? `${summaryActive} kcal`
                : "-"}
          </p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-sm text-muted">{rangeLabel(range, "Consumed")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {!canLoadDiary
              ? "-"
              : consumedLoading
                ? "…"
                : summaryConsumed != null
                  ? `${summaryConsumed} kcal`
                  : "-"}
          </p>
          {canLoadDiary && !consumedLoading && summaryConsumed != null ? (
            <NutritionMacroSummary
              macros={consumedTotals}
              variant="short"
              className="mt-1"
            />
          ) : null}
          {canLoadDiary ? (
            <Link
              href={routes.meals}
              className="mt-1 inline-block text-xs font-medium text-accent hover:underline"
            >
              Log food
            </Link>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Sign in to track consumed nutrition.
            </p>
          )}
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-sm text-muted">{rangeLabel(range, "Total burned")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {healthLoading && summaryPassive == null
              ? "…"
              : summaryTotalBurned != null
                ? `${summaryTotalBurned} kcal`
                : "-"}
          </p>
          {summaryPassive != null || summaryActive != null ? (
            <p className="mt-1 text-xs text-muted">Passive + active</p>
          ) : null}
        </SurfaceCard>
      </div>

      {summaryNet != null ? (
        <SurfaceCard className="p-4">
          <p className="text-sm text-muted">Net (consumed − total burned)</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
            {summaryNet >= 0 ? "+" : ""}
            {summaryNet} kcal
          </p>
        </SurfaceCard>
      ) : null}

      {canLoadDiary && !consumedLoading && summaryConsumed != null ? (
        <NutritionTotalsPanel title={totalsTitle} nutrition={consumedTotals}>
          {range === "today" &&
          todayDiary &&
          todayDiary.meals.some((m) => m.entries.length > 0) ? (
            <>
              <h3 className="pt-1 text-sm font-semibold text-foreground">
                Meals
              </h3>
              {todayDiary.meals.map((meal) =>
                meal.entries.length > 0 ? (
                  <div key={meal.meal} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">
                        {FATSECRET_MEAL_LABELS[meal.meal]}
                      </span>
                      <span className="tabular-nums text-foreground">
                        {Math.round(meal.calories)} kcal
                      </span>
                    </div>
                    <NutritionMacroSummary
                      macros={meal}
                      variant="short"
                      className="text-right"
                    />
                  </div>
                ) : null,
              )}
            </>
          ) : null}
        </NutritionTotalsPanel>
      ) : null}

      <NutritionTrendChart
        range={range}
        burnedSeries={dailyHealth.activeKcalChartSeries}
        dateKeys={chartDateKeys}
        diaryByDate={diaryRange.byDate}
        diaryLoading={diaryRange.loading}
        canLoadDiary={canLoadDiary}
        healthLoading={healthLoading}
        unavailableReason={dailyHealth.unavailableReason}
      />
    </div>
  );
}
