"use client";

import { useMemo, useState } from "react";
import BackNavLink from "@/components/common/BackNavLink";
import SurfaceCard from "@/components/common/SurfaceCard";
import HealthRangeSwitcher from "@/components/health/HealthRangeSwitcher";
import { useDailyHealthFromHealth } from "@/hooks/useDailyHealthFromHealth";
import { routes } from "@/lib/appRoutes";
import {
  filterEntriesByHealthRange,
  type HealthRangePresetId,
} from "@/lib/health/healthRangePresets";
import DailyHealthMetricProgressChart from "@/components/progress/DailyHealthMetricProgressChart";

export default function HealthCaloriesPage() {
  const dailyHealth = useDailyHealthFromHealth();
  const loading = dailyHealth.loading && dailyHealth.available;
  const [range, setRange] = useState<HealthRangePresetId>("week");

  const filteredBurned = useMemo(
    () => filterEntriesByHealthRange(dailyHealth.activeKcalChartSeries, range),
    [dailyHealth.activeKcalChartSeries, range],
  );

  const summaryBurned = useMemo(() => {
    if (range === "today") {
      const value = dailyHealth.todayActiveKcal;
      return value != null ? `${Math.round(value)} kcal` : "—";
    }
    if (filteredBurned.length === 0) return "—";
    const total = filteredBurned.reduce((sum, row) => sum + row.value, 0);
    return `${Math.round(total).toLocaleString()} kcal`;
  }, [range, dailyHealth.todayActiveKcal, filteredBurned]);

  const summaryLabel = range === "today" ? "Burned today" : `Burned (${range})`;

  return (
    <div className="flex flex-col gap-2 py-6">
      <BackNavLink fallbackHref={routes.health} />
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-foreground">Calories</h1>
        <HealthRangeSwitcher value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SurfaceCard className="p-4">
          <p className="text-sm text-muted">{summaryLabel}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {loading ? "…" : summaryBurned}
          </p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-sm text-muted">Consumed</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            —
          </p>
          <p className="mt-1 text-xs text-muted">Meal logging coming soon</p>
        </SurfaceCard>
      </div>

      <DailyHealthMetricProgressChart
        title="Active calories"
        subtitle="Total active energy per calendar day from Health Connect."
        series={filteredBurned}
        yLabel="kcal"
        emptyDetail="No active calorie data for this range yet."
        formatValue={(v) => `${Math.round(v)} kcal`}
        loading={loading}
        unavailableReason={dailyHealth.unavailableReason}
        chartType="bar"
        hideHeader
      />
    </div>
  );
}
