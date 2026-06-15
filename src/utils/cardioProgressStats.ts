import { exerciseMap } from "@/core/catalog";
import { resolveWorkoutCardioExercises } from "@/lib/resolveWorkoutCardio";
import type { WorkoutLog } from "@/types";

export interface CardioChartPoint {
  date: string;
  xLabel: string;
  sortKey: number;
  distanceMi?: number;
  durationSec?: number;
  durationMin?: number;
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

/** Completed sessions for one endurance exercise with distance and/or duration. */
export function buildCardioChartSeries(
  history: WorkoutLog[],
  exerciseId: string,
): CardioChartPoint[] {
  const rows: CardioChartPoint[] = [];

  for (const w of history) {
    const entry = resolveWorkoutCardioExercises(w).find(
      (r) => r.exerciseId === exerciseId,
    );
    if (!entry?.completed || entry.skipped) continue;

    const dist = entry.actualDistanceMi;
    const dur = entry.actualDuration;
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

export function cardioExerciseTitle(exerciseId: string): string {
  return exerciseMap[exerciseId]?.name ?? exerciseId;
}

/** e.g. `10:33/mi` */
export function formatPacePerMile(
  secondsPerMile: number | null | undefined,
): string {
  if (
    secondsPerMile == null ||
    !Number.isFinite(secondsPerMile) ||
    secondsPerMile <= 0
  ) {
    return "-";
  }
  const rounded = Math.round(secondsPerMile);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}/mi`;
}
