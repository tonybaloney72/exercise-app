"use client";

import { useMemo, useState } from "react";
import BackNavLink from "@/components/common/BackNavLink";
import DailyStepsProgressChart from "@/components/progress/DailyStepsProgressChart";
import DailyHealthMetricProgressChart from "@/components/progress/DailyHealthMetricProgressChart";
import WeightProgressChart from "@/components/progress/WeightProgressChart";
import HealthTodayDetail, {
  HealthTodayWeightDetail,
} from "@/components/health/HealthTodayDetail";
import { useDailyHealthFromHealth } from "@/hooks/useDailyHealthFromHealth";
import {
  filterEntriesByHealthRange,
  type HealthRangePresetId,
} from "@/lib/health/healthRangePresets";
import type { HealthStatSlug } from "@/lib/health/healthStatRoutes";
import { healthStatDisplayForSlug } from "@/lib/health/healthStatRoutes";
import { routes } from "@/lib/appRoutes";
import HealthRangeSwitcher from "@/components/health/HealthRangeSwitcher";
import type { DailyHealthMetricChartPoint } from "@/lib/health/dailyHealthChart";
import type { DailyStepsChartPoint } from "@/lib/health/dailyStepsChart";

function filterMetricSeries(
  series: DailyHealthMetricChartPoint[],
  preset: HealthRangePresetId,
): DailyHealthMetricChartPoint[] {
  return filterEntriesByHealthRange(series, preset);
}

function filterStepsSeries(
  series: DailyStepsChartPoint[],
  preset: HealthRangePresetId,
): DailyStepsChartPoint[] {
  return filterEntriesByHealthRange(series, preset);
}

export default function HealthStatDetail({ slug }: { slug: HealthStatSlug }) {
  const display = healthStatDisplayForSlug(slug)!;
  const dailyHealth = useDailyHealthFromHealth();
  const loading = dailyHealth.loading && dailyHealth.available;
  const [range, setRange] = useState<HealthRangePresetId>("today");

  const filteredSteps = useMemo(
    () => filterStepsSeries(dailyHealth.stepsChartSeries, range),
    [dailyHealth.stepsChartSeries, range],
  );
  const filteredAvgHr = useMemo(
    () => filterMetricSeries(dailyHealth.avgHeartRateChartSeries, range),
    [dailyHealth.avgHeartRateChartSeries, range],
  );
  const filteredRestingHr = useMemo(
    () => filterMetricSeries(dailyHealth.restingHeartRateChartSeries, range),
    [dailyHealth.restingHeartRateChartSeries, range],
  );
  const filteredSpo2 = useMemo(
    () => filterMetricSeries(dailyHealth.oxygenSaturationChartSeries, range),
    [dailyHealth.oxygenSaturationChartSeries, range],
  );
  const filteredSleep = useMemo(
    () => filterMetricSeries(dailyHealth.sleepTotalChartSeries, range),
    [dailyHealth.sleepTotalChartSeries, range],
  );
  const filteredVo2 = useMemo(
    () => filterMetricSeries(dailyHealth.vo2MaxChartSeries, range),
    [dailyHealth.vo2MaxChartSeries, range],
  );

  return (
    <div className="flex flex-col gap-2 py-6">
      <BackNavLink fallbackHref={routes.health} />
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-foreground">{display.label}</h1>
        <HealthRangeSwitcher value={range} onChange={setRange} />
      </div>

      {range === "today" && slug === "weight" ? (
        <HealthTodayWeightDetail />
      ) : range === "today" ? (
        <HealthTodayDetail
          slug={slug}
          unavailableReason={dailyHealth.unavailableReason}
        />
      ) : slug === "weight" ? (
        <WeightProgressChart variant="health" healthRange={range} />
      ) : slug === "steps" ? (
        <DailyStepsProgressChart
          series={filteredSteps}
          loading={loading}
          unavailableReason={dailyHealth.unavailableReason}
          hideHeader
        />
      ) : slug === "heart-rate" ? (
        <DailyHealthMetricProgressChart
          title="Average heart rate"
          subtitle="Daily average heart rate from Health Connect samples."
          series={filteredAvgHr}
          yLabel="bpm"
          emptyDetail="No heart rate data for this range yet."
          formatValue={(v) => `${Math.round(v)} bpm`}
          loading={loading}
          unavailableReason={dailyHealth.unavailableReason}
          chartType="line"
          allowDecimals
          hideHeader
        />
      ) : slug === "resting-heart-rate" ? (
        <DailyHealthMetricProgressChart
          title="Resting heart rate"
          subtitle="Daily resting heart rate from Health Connect."
          series={filteredRestingHr}
          yLabel="bpm"
          emptyDetail="No resting heart rate data for this range yet."
          formatValue={(v) => `${Math.round(v)} bpm`}
          loading={loading}
          unavailableReason={dailyHealth.unavailableReason}
          chartType="line"
          allowDecimals
          hideHeader
        />
      ) : slug === "blood-oxygen" ? (
        <DailyHealthMetricProgressChart
          title="Blood oxygen (SpO₂)"
          subtitle="Daily average oxygen saturation from Health Connect."
          series={filteredSpo2}
          yLabel="%"
          emptyDetail="No SpO₂ data for this range yet."
          formatValue={(v) => `${v.toFixed(1)}%`}
          loading={loading}
          unavailableReason={dailyHealth.unavailableReason}
          chartType="line"
          allowDecimals
          hideHeader
        />
      ) : slug === "sleep" ? (
        <DailyHealthMetricProgressChart
          title="Sleep"
          subtitle="Total sleep per night (wake date) from Health Connect."
          series={filteredSleep}
          yLabel="min"
          emptyDetail="No sleep data for this range yet."
          formatValue={(v) => `${Math.round(v)} min`}
          loading={loading}
          unavailableReason={dailyHealth.unavailableReason}
          chartType="bar"
          hideHeader
        />
      ) : (
        <DailyHealthMetricProgressChart
          title="VO₂ max"
          subtitle="Latest reading per day when your watch or phone reports VO₂ max."
          series={filteredVo2}
          yLabel="ml/kg/min"
          emptyDetail="No VO₂ max readings for this range yet."
          formatValue={(v) => `${v.toFixed(1)}`}
          loading={loading}
          unavailableReason={dailyHealth.unavailableReason}
          chartType="line"
          allowDecimals
          hideHeader
        />
      )}
    </div>
  );
}
