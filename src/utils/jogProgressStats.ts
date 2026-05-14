import type { WorkoutLog } from "@/types";

export interface JogChartPoint {
  date: string;
  xLabel: string;
  sortKey: number;
  /** Miles; undefined if not logged */
  distanceMi?: number;
  /** Total seconds; undefined if not logged */
  durationSec?: number;
  /** Minutes, for chart axis */
  durationMin?: number;
  /** Seconds per mile when distance & duration both known */
  paceSecondsPerMile?: number;
}

function parseDateKeyMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0).getTime();
}

function shortLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m ?? 1}/${d ?? 1}`;
}

/**
 * Completed jogs with at least distance or duration logged (skipped jogs excluded).
 */
export function buildJogChartSeries(history: WorkoutLog[]): JogChartPoint[] {
  const rows: JogChartPoint[] = [];

  for (const w of history) {
    if (!w.jogCompleted || w.jogSkipped) continue;
    const dist = w.jogDistance;
    const dur = w.jogDurationSeconds;
    if (dist == null && dur == null) continue;

    let pace: number | undefined;
    if (dist != null && dist > 0 && dur != null && dur > 0) {
      pace = dur / dist;
    }

    rows.push({
      date: w.date,
      xLabel: shortLabel(w.date),
      sortKey: parseDateKeyMs(w.date),
      distanceMi: dist ?? undefined,
      durationSec: dur ?? undefined,
      durationMin: dur != null ? dur / 60 : undefined,
      paceSecondsPerMile: pace,
    });
  }

  rows.sort((a, b) => a.sortKey - b.sortKey);
  return rows;
}

/** e.g. `10:33/mi` */
export function formatPacePerMile(secondsPerMile: number | null | undefined): string {
  if (secondsPerMile == null || !Number.isFinite(secondsPerMile) || secondsPerMile <= 0) {
    return "—";
  }
  const rounded = Math.round(secondsPerMile);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}/mi`;
}
