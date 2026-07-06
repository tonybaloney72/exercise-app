import { formatLocalDateKey } from "@/utils/localDateKey";

export const HEALTH_RANGE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" },
] as const;

export type HealthRangePresetId = (typeof HEALTH_RANGE_PRESETS)[number]["id"];

function isHealthRangePresetId(
  value: string,
): value is HealthRangePresetId {
  return HEALTH_RANGE_PRESETS.some((preset) => preset.id === value);
}

function subtractDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function subtractMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() - months);
  return next;
}

/** Inclusive lower bound (`YYYY-MM-DD`); `today` is today only; `all` returns null. */
export function healthRangeFromDate(
  preset: HealthRangePresetId,
  ref: Date = new Date(),
): string | null {
  switch (preset) {
    case "all":
      return null;
    case "today":
      return formatLocalDateKey(ref);
    case "week":
      return formatLocalDateKey(subtractDays(ref, 6));
    case "month":
      return formatLocalDateKey(subtractMonths(ref, 1));
    case "year":
      return formatLocalDateKey(subtractMonths(ref, 12));
    default:
      return null;
  }
}

export function filterEntriesByHealthRange<T extends { date: string }>(
  entries: readonly T[],
  preset: HealthRangePresetId,
  ref: Date = new Date(),
): T[] {
  const fromDate = healthRangeFromDate(preset, ref);
  const todayKey = formatLocalDateKey(ref);
  if (preset === "today") {
    return entries.filter((entry) => entry.date === todayKey);
  }
  if (!fromDate) return [...entries];
  return entries.filter((entry) => entry.date >= fromDate);
}
