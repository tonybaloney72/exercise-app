import type { DailyHealthMetricChartPoint } from "@/lib/health/dailyHealthChart";
import {
  filterEntriesByHealthRange,
  healthRangeFromDate,
  type HealthRangePresetId,
} from "@/lib/health/healthRangePresets";
import type { FoodDiaryDay } from "@/lib/fatsecret/foodDiary";
import type { FoodNutrition } from "@/lib/nutrition/foodNutrition";
import { sumNutrition } from "@/lib/nutrition/foodNutrition";
import {
  buildChartDayAxis,
  formatLocalDateKey,
  parseLocalDateKey,
  sortByChartSortKey,
} from "@/utils/localDateKey";

export const NUTRITION_TREND_METRICS = [
  { id: "calories", label: "Calories", unit: "kcal" as const },
  { id: "protein", label: "Protein", unit: "g" as const },
  { id: "carbs", label: "Carbs", unit: "g" as const },
  { id: "fat", label: "Fat", unit: "g" as const },
  { id: "fiber", label: "Fiber", unit: "g" as const },
  { id: "sugar", label: "Sugar", unit: "g" as const },
  { id: "sodium", label: "Sodium", unit: "mg" as const },
] as const;

export type NutritionTrendMetricId =
  (typeof NUTRITION_TREND_METRICS)[number]["id"];

export type NutritionTrendPoint = {
  date: string;
  xLabel: string;
  sortKey: number;
  burned: number | null;
  consumed: FoodNutrition | null;
};

export const MAX_NUTRITION_DIARY_DAYS = 90;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Calendar date keys to load meal-log totals for the selected range (capped). */
function dateKeysForNutritionRange(
  range: HealthRangePresetId,
  ref: Date = new Date(),
): string[] {
  const todayKey = formatLocalDateKey(ref);
  if (range === "today") return [todayKey];

  const end = parseLocalDateKey(todayKey);
  if (!end) return [todayKey];

  let start: Date;
  if (range === "all") {
    start = addDays(end, -(MAX_NUTRITION_DIARY_DAYS - 1));
  } else {
    const fromKey = healthRangeFromDate(range, ref);
    start = parseLocalDateKey(fromKey ?? todayKey) ?? end;
  }

  const keys: string[] = [];
  let cursor = start;
  while (cursor <= end && keys.length < MAX_NUTRITION_DIARY_DAYS) {
    keys.push(formatLocalDateKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

export function chartDateKeysForNutritionTrend(args: {
  range: HealthRangePresetId;
  burnedSeries: DailyHealthMetricChartPoint[];
  ref?: Date;
}): string[] {
  const ref = args.ref ?? new Date();
  const burnedDates = filterEntriesByHealthRange(
    args.burnedSeries,
    args.range,
    ref,
  ).map((point) => point.date);
  const rangeDates = dateKeysForNutritionRange(args.range, ref);
  const unique = new Set([...burnedDates, ...rangeDates]);
  return sortByChartSortKey(
    [...unique].map((date) => ({ date, ...buildChartDayAxis(date) })),
  ).map((row) => row.date);
}

function diaryToNutrition(diary: FoodDiaryDay): FoodNutrition {
  const { date: _date, meals: _meals, ...nutrition } = diary;
  return nutrition;
}

export function sumConsumedForDateKeys(
  dateKeys: readonly string[],
  diaryByDate: ReadonlyMap<string, FoodDiaryDay>,
): FoodNutrition {
  const rows = dateKeys
    .map((dateKey) => diaryByDate.get(dateKey))
    .filter((row): row is FoodDiaryDay => row != null)
    .map(diaryToNutrition);
  return sumNutrition(rows);
}

export function sumConsumedForHealthRange(
  range: HealthRangePresetId,
  diaryByDate: ReadonlyMap<string, FoodDiaryDay>,
  ref: Date = new Date(),
): FoodNutrition {
  return sumConsumedForDateKeys(
    dateKeysForNutritionRange(range, ref),
    diaryByDate,
  );
}

export function buildNutritionTrendPoints(args: {
  dateKeys: string[];
  burnedSeries: DailyHealthMetricChartPoint[];
  diaryByDate: Map<string, FoodDiaryDay>;
}): NutritionTrendPoint[] {
  const burnedByDate = new Map(
    args.burnedSeries.map((point) => [point.date, point.value]),
  );

  return sortByChartSortKey(
    args.dateKeys.map((date) => {
      const diary = args.diaryByDate.get(date);
      return {
        date,
        ...buildChartDayAxis(date),
        burned: burnedByDate.get(date) ?? null,
        consumed: diary ? diaryToNutrition(diary) : null,
      };
    }),
  );
}

function consumedMetricValue(
  consumed: FoodNutrition | null,
  metric: NutritionTrendMetricId,
): number | null {
  if (!consumed) return null;
  switch (metric) {
    case "calories":
      return consumed.calories;
    case "protein":
      return consumed.proteinG;
    case "carbs":
      return consumed.carbsG;
    case "fat":
      return consumed.fatG;
    case "fiber":
      return consumed.fiberG;
    case "sugar":
      return consumed.sugarG;
    case "sodium":
      return consumed.sodiumMg;
    default:
      return null;
  }
}

export function nutritionTrendHasData(
  points: NutritionTrendPoint[],
  metric: NutritionTrendMetricId,
): boolean {
  return points.some((point) => {
    if (metric === "calories") {
      return (point.burned ?? 0) > 0 || (consumedMetricValue(point.consumed, metric) ?? 0) > 0;
    }
    return (consumedMetricValue(point.consumed, metric) ?? 0) > 0;
  });
}

export function formatNutritionTrendValue(
  value: number,
  metric: NutritionTrendMetricId,
): string {
  const meta = NUTRITION_TREND_METRICS.find((row) => row.id === metric);
  const unit = meta?.unit ?? "g";
  const rounded =
    unit === "kcal" || unit === "mg"
      ? Math.round(value)
      : Math.round(value * 10) / 10;
  return unit === "kcal" ? `${rounded} kcal` : `${rounded} ${unit}`;
}

export function consumedValueForMetric(
  point: NutritionTrendPoint,
  metric: NutritionTrendMetricId,
): number | null {
  return consumedMetricValue(point.consumed, metric);
}
