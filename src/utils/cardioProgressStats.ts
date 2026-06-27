import { exerciseMap } from "@/core/catalog";
import { computeCardioPaceMetrics } from "@/lib/health/cardioPaceMetrics";
import { resolveWorkoutCardioExercises } from "@/lib/resolveWorkoutCardio";
import type { WorkoutLog } from "@/types";
import {
  buildChartSessionAxis,
  sortByChartSortKey,
} from "@/utils/localDateKey";
import { positiveNumber } from "@/utils/optionalNumber";

export interface CardioChartPoint {
  date: string;
  xLabel: string;
  sortKey: number;
  /** 1-based index when multiple sessions were logged on the same day. */
  sessionIndex?: number;
  distanceMi?: number;
  durationSec?: number;
  durationMin?: number;
  paceSecondsPerMile?: number;
  speedMph?: number;
  /** Health Connect metrics for this session window. */
  stepCount?: number;
  activeCaloriesKcal?: number;
  avgHeartRateBpm?: number;
}

/** Completed sessions for one endurance exercise with distance and/or duration. */
export function buildCardioChartSeries(
  history: WorkoutLog[],
  exerciseId: string,
): CardioChartPoint[] {
  const rows: CardioChartPoint[] = [];

  for (const w of history) {
    const entries = resolveWorkoutCardioExercises(w).filter(
      (r) =>
        r.exerciseId === exerciseId && r.completed && !r.skipped,
    );

    entries.forEach((entry, index) => {
      const dist = entry.actualDistanceMi;
      const dur = entry.actualDuration;
      const steps = positiveNumber(entry.stepCount);
      const kcal = positiveNumber(entry.activeCaloriesKcal);
      const hr = positiveNumber(entry.avgHeartRateBpm);
      if (dist == null && dur == null) return;

      let pace: number | undefined;
      let speedMph: number | undefined;
      if (dist != null && dist > 0 && dur != null && dur > 0) {
        pace = dur / dist;
        speedMph = computeCardioPaceMetrics(dist, dur)?.avgSpeedMph;
      }

      const sessionIndex = index + 1;
      rows.push({
        date: w.date,
        ...buildChartSessionAxis(w.date, sessionIndex),
        distanceMi: dist ?? undefined,
        durationSec: dur ?? undefined,
        durationMin: dur != null ? dur / 60 : undefined,
        paceSecondsPerMile: pace,
        speedMph,
        stepCount: steps,
        activeCaloriesKcal: kcal,
        avgHeartRateBpm: hr,
      });
    });
  }

  return sortByChartSortKey(rows);
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

/** e.g. `6 mph` */
export function formatSpeedMph(mph: number | null | undefined): string {
  if (mph == null || !Number.isFinite(mph) || mph <= 0) {
    return "-";
  }
  return `${mph} mph`;
}
