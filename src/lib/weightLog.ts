import type { WeightLogEntry } from "@/types";
import { parseLocalDateKey } from "@/utils/localDateKey";

export interface WeightChartPoint {
  /** Stable ordinal for the chart x-axis (one slot per entry). */
  index: number;
  date: string;
  /** Short axis label (e.g. `5/12`) */
  xLabel: string;
  weightLb: number;
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` from a date key or ISO timestamp. */
export function normalizeWeightDateKey(raw: string): string {
  const trimmed = raw.trim();
  if (DATE_KEY_RE.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

function parseWeightLb(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}

export function sanitizeWeightLog(raw: unknown): WeightLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: WeightLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const date =
      typeof o.date === "string" ? normalizeWeightDateKey(o.date) : "";
    const weightLb = parseWeightLb(o.weightLb);
    if (!date || !(weightLb > 0)) continue;
    out.push({ date, weightLb });
  }
  return dedupeByDate(out);
}

function dedupeByDate(entries: WeightLogEntry[]): WeightLogEntry[] {
  const byDate = new Map<string, WeightLogEntry>();
  for (const e of entries) {
    byDate.set(e.date, e);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Later sources win when the same calendar day appears more than once. */
export function mergeWeightEntries(
  ...sources: readonly (readonly WeightLogEntry[])[]
): WeightLogEntry[] {
  const merged: WeightLogEntry[] = [];
  for (const source of sources) {
    merged.push(...source);
  }
  return dedupeByDate(merged);
}

export function getWeightForDate(
  log: readonly WeightLogEntry[],
  dateKey: string,
): WeightLogEntry | undefined {
  return log.find((e) => e.date === dateKey);
}

export function upsertWeightEntry(
  log: WeightLogEntry[],
  dateKey: string,
  weightLb: number,
): WeightLogEntry[] {
  const next = log.filter((e) => e.date !== dateKey);
  next.push({ date: dateKey, weightLb });
  return next.sort((a, b) => a.date.localeCompare(b.date));
}

function shortDateLabel(dateKey: string, includeYear = false): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return dateKey;
  const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;
  if (!includeYear) return monthDay;
  const year = d.getFullYear() % 100;
  return `${monthDay}/${year}`;
}

/** True when chart points span more than one calendar year. */
export function weightChartSpansYears(
  points: readonly { date: string }[],
): boolean {
  if (points.length < 2) return false;
  const firstYear = points[0]!.date.slice(0, 4);
  return points.some((p) => p.date.slice(0, 4) !== firstYear);
}

/** Axis / tooltip label for a weight chart point. */
export function formatWeightChartDateLabel(
  dateKey: string,
  includeYear = false,
): string {
  return shortDateLabel(normalizeWeightDateKey(dateKey), includeYear);
}

/** Chronological points for charting. */
export function buildWeightChartSeries(
  log: readonly WeightLogEntry[],
): WeightChartPoint[] {
  const sorted = log
    .filter(
      (entry) =>
        DATE_KEY_RE.test(entry.date) &&
        Number.isFinite(entry.weightLb) &&
        entry.weightLb > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const includeYear = weightChartSpansYears(sorted);
  return sorted.map((entry, index) => ({
    index,
    date: entry.date,
    xLabel: shortDateLabel(entry.date, includeYear),
    weightLb: entry.weightLb,
  }));
}

export function formatWeightLb(weightLb: number): string {
  const rounded =
    Math.abs(weightLb - Math.round(weightLb)) < 0.05
      ? Math.round(weightLb)
      : Math.round(weightLb * 10) / 10;
  return `${rounded} lb`;
}
