"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import TabEnterMotion from "@/components/common/TabEnterMotion";
import SurfaceCard, {
  surfaceCardClassName,
} from "@/components/common/SurfaceCard";
import { useDailyHealthFromHealth } from "@/hooks/useDailyHealthFromHealth";
import { useNutritionDiary } from "@/hooks/useNutritionDiary";
import { HEALTH_STAT_DISPLAY } from "@/lib/health/healthStatRoutes";
import { routes } from "@/lib/appRoutes";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { getWeightForDate, formatWeightLb } from "@/lib/weightLog";
import { useWeightStore } from "@/stores/useWeightStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { WeightLogEntry } from "@/types";

function formatStatValue(
  loading: boolean,
  value: number | null,
  format: (value: number) => string = (v) => v.toLocaleString(),
): string {
  if (loading) return "…";
  if (value == null) return "—";
  return format(value);
}

function metricTodayValue(
  dailyHealth: ReturnType<typeof useDailyHealthFromHealth>,
  metricKey: (typeof HEALTH_STAT_DISPLAY)[number]["metricKey"],
): number | null {
  switch (metricKey) {
    case "steps":
      return dailyHealth.todaySteps;
    case "avg_heart_rate_bpm":
      return dailyHealth.todayAvgHeartRateBpm;
    case "resting_heart_rate_bpm":
      return dailyHealth.todayRestingHeartRateBpm;
    case "oxygen_saturation_pct":
      return dailyHealth.todayOxygenSaturationPct;
    case "sleep_total_min":
      return dailyHealth.todaySleepTotalMin;
    case "vo2_max_ml_kg_min":
      return dailyHealth.todayVo2MaxMlKgMin;
    default:
      return null;
  }
}

function weightTodayValue(entries: readonly WeightLogEntry[]): number | null {
  const todayKey = formatLocalDateKey();
  const entry = getWeightForDate(entries, todayKey);
  return entry?.weightLb ?? null;
}

function formatMetricValue(
  metricKey: (typeof HEALTH_STAT_DISPLAY)[number]["metricKey"],
  loading: boolean,
  value: number | null,
): string {
  switch (metricKey) {
    case "avg_heart_rate_bpm":
    case "resting_heart_rate_bpm":
      return formatStatValue(loading, value, (v) => `${Math.round(v)} bpm`);
    case "oxygen_saturation_pct":
      return formatStatValue(loading, value, (v) => `${v.toFixed(1)}%`);
    case "sleep_total_min":
      return formatStatValue(loading, value, (v) => {
        const h = Math.floor(v / 60);
        const m = Math.round(v % 60);
        return `${h}h ${m}m`;
      });
    case "vo2_max_ml_kg_min":
      return formatStatValue(loading, value, (v) => v.toFixed(1));
    case "weight_lb":
      return formatStatValue(loading, value, (v) => formatWeightLb(v));
    default:
      return formatStatValue(loading, value);
  }
}

export default function HealthLandingContent() {
  const dailyHealth = useDailyHealthFromHealth();
  const weightEntries = useWeightStore((s) => s.entries);
  const loadWeight = useWeightStore((s) => s.load);
  const authMode = useAuthStore((s) => s.mode);
  const todayKey = formatLocalDateKey();
  const canLoadDiary = authMode === "authenticated";
  const nutritionDiary = useNutritionDiary(todayKey, canLoadDiary);

  useEffect(() => {
    if (authMode === "loading") return;
    void loadWeight();
  }, [authMode, loadWeight]);

  const statCards = useMemo(
    () =>
      HEALTH_STAT_DISPLAY.map((stat) => {
        const value =
          stat.slug === "weight"
            ? formatMetricValue(
                stat.metricKey,
                false,
                weightTodayValue(weightEntries),
              )
            : formatMetricValue(
                stat.metricKey,
                dailyHealth.loading,
                metricTodayValue(dailyHealth, stat.metricKey),
              );
        return {
          ...stat,
          value,
          href: routes.healthStat(stat.slug),
        };
      }),
    [dailyHealth, weightEntries, todayKey],
  );

  const burnedValue = formatStatValue(
    dailyHealth.loading,
    dailyHealth.todayActiveKcal,
    (v) => `${Math.round(v)} kcal`,
  );

  const consumedValue = useMemo(() => {
    if (!canLoadDiary) return "—";
    if (nutritionDiary.loading) return "…";
    if (nutritionDiary.error) return "—";
    return `${Math.round(nutritionDiary.data?.calories ?? 0)} kcal`;
  }, [
    canLoadDiary,
    nutritionDiary.loading,
    nutritionDiary.error,
    nutritionDiary.data?.calories,
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2">
        {statCards.map((card, i) => (
          <TabEnterMotion key={card.slug} delay={i * 0.03}>
            <Link
              href={card.href}
              className={`${surfaceCardClassName} block p-4 transition-colors hover:border-accent/40 hover:bg-surface-hover`}
            >
              <span className="text-lg">{card.icon}</span>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                {card.value}
              </p>
              <p className="text-sm leading-snug text-muted">
                {card.shortLabel}
              </p>
            </Link>
          </TabEnterMotion>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={routes.healthNutrition}
          className={`${surfaceCardClassName} block p-4 transition-colors hover:border-accent/40 hover:bg-surface-hover`}
        >
          <span className="text-lg">⚡</span>
          <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
            {burnedValue}
          </p>
          <p className="text-sm leading-snug text-muted">Burned today</p>
        </Link>
        <Link
          href={routes.healthNutrition}
          className={`${surfaceCardClassName} block p-4 transition-colors hover:border-accent/40 hover:bg-surface-hover`}
        >
          <span className="text-lg">🍽️</span>
          <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
            {consumedValue}
          </p>
          <p className="text-sm leading-snug text-muted">Consumed today</p>
        </Link>
      </div>

    </div>
  );
}
