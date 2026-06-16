import { formatLocalDateKey } from "@/utils/localDateKey";

export const WEIGHT_RANGE_PRESETS = [
  { id: "2w", label: "2 wk" },
  { id: "1mo", label: "1 mo" },
  { id: "3mo", label: "3 mo" },
  { id: "6mo", label: "6 mo" },
  { id: "1y", label: "1 yr" },
  { id: "all", label: "All" },
] as const;

export type WeightRangePresetId = (typeof WEIGHT_RANGE_PRESETS)[number]["id"];

export function isWeightRangePresetId(value: string): value is WeightRangePresetId {
  return WEIGHT_RANGE_PRESETS.some((p) => p.id === value);
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

/** Inclusive lower bound (`YYYY-MM-DD`) for a chart preset; null = all time. */
export function weightRangeFromDate(
  preset: WeightRangePresetId,
  ref: Date = new Date(),
): string | null {
  switch (preset) {
    case "all":
      return null;
    case "2w":
      return formatLocalDateKey(subtractDays(ref, 14));
    case "1mo":
      return formatLocalDateKey(subtractMonths(ref, 1));
    case "3mo":
      return formatLocalDateKey(subtractMonths(ref, 3));
    case "6mo":
      return formatLocalDateKey(subtractMonths(ref, 6));
    case "1y":
      return formatLocalDateKey(subtractMonths(ref, 12));
    default:
      return null;
  }
}

export function filterWeightEntriesByRange<T extends { date: string }>(
  entries: readonly T[],
  preset: WeightRangePresetId,
  ref: Date = new Date(),
): T[] {
  const fromDate = weightRangeFromDate(preset, ref);
  if (!fromDate) return [...entries];
  return entries.filter((entry) => entry.date >= fromDate);
}
