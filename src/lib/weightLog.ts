import type { WeightLogEntry } from "@/types";
import { parseLocalDateKey } from "@/utils/weekCalendar";

export interface WeightChartPoint {
  date: string;
  /** Short axis label (e.g. `5/12`) */
  xLabel: string;
  weightLb: number;
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeWeightLog(raw: unknown): WeightLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: WeightLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const date = typeof o.date === "string" ? o.date.trim() : "";
    const weightLb =
      typeof o.weightLb === "number" && Number.isFinite(o.weightLb)
        ? o.weightLb
        : NaN;
    if (!DATE_KEY_RE.test(date) || !(weightLb > 0)) continue;
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

export function getWeightForDate(
  log: WeightLogEntry[],
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

function shortDateLabel(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return dateKey;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Chronological points for charting (optionally limited to most recent entries). */
export function buildWeightChartSeries(
  log: WeightLogEntry[],
  maxPoints = 60,
): WeightChartPoint[] {
  const sorted = [...sanitizeWeightLog(log)].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const slice =
    maxPoints > 0 && sorted.length > maxPoints
      ? sorted.slice(sorted.length - maxPoints)
      : sorted;
  return slice.map((e) => ({
    date: e.date,
    xLabel: shortDateLabel(e.date),
    weightLb: e.weightLb,
  }));
}

export function formatWeightLb(weightLb: number): string {
  const rounded =
    Math.abs(weightLb - Math.round(weightLb)) < 0.05
      ? Math.round(weightLb)
      : Math.round(weightLb * 10) / 10;
  return `${rounded} lb`;
}
