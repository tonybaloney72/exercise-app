import { resolveWorkoutCardioExercises } from "@/lib/resolveWorkoutCardio";
import type { WorkoutLog } from "@/types";
import {
  buildChartSessionAxis,
  sortByChartSortKey,
} from "@/utils/localDateKey";
import { positiveNumber } from "@/utils/optionalNumber";

export interface CardioHealthChartPoint {
  date: string;
  xLabel: string;
  sortKey: number;
  sessionIndex?: number;
  stepCount?: number;
  activeCaloriesKcal?: number;
  avgHeartRateBpm?: number;
}

export interface CardioHealthTotals {
  totalActiveKcal: number;
  sessionsWithKcal: number;
  sessionsWithHeartRate: number;
}

/** Per completed cardio session with steps, active kcal, and/or avg HR logged. */
export function buildCardioHealthChartSeries(
  history: WorkoutLog[],
): CardioHealthChartPoint[] {
  const rows: CardioHealthChartPoint[] = [];

  for (const workout of history) {
    const entries = resolveWorkoutCardioExercises(workout).filter(
      (row) => row.completed && !row.skipped,
    );

    entries.forEach((entry, index) => {
      const kcal = positiveNumber(entry.activeCaloriesKcal);
      const hr = positiveNumber(entry.avgHeartRateBpm);

      if (kcal == null && hr == null) return;

      const sessionIndex = index + 1;
      rows.push({
        date: workout.date,
        ...buildChartSessionAxis(workout.date, sessionIndex),
        activeCaloriesKcal: kcal,
        avgHeartRateBpm: hr,
      });
    });
  }

  return sortByChartSortKey(rows);
}

export function buildCardioHealthTotals(
  history: WorkoutLog[],
): CardioHealthTotals {
  let totalActiveKcal = 0;
  let sessionsWithKcal = 0;
  let sessionsWithHeartRate = 0;

  for (const workout of history) {
    for (const row of resolveWorkoutCardioExercises(workout)) {
      if (!row.completed || row.skipped) continue;
      const kcal = positiveNumber(row.activeCaloriesKcal);
      const hr = positiveNumber(row.avgHeartRateBpm);
      if (kcal != null) {
        totalActiveKcal += kcal;
        sessionsWithKcal += 1;
      }
      if (hr != null) {
        sessionsWithHeartRate += 1;
      }
    }
  }

  return {
    totalActiveKcal,
    sessionsWithKcal,
    sessionsWithHeartRate,
  };
}
