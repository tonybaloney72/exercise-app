import { resolveWorkoutCardioExercises } from "@/lib/resolveWorkoutCardio";
import type { WorkoutLog } from "@/types";

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

function parseDateKeyMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0).getTime();
}

function shortLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m ?? 1}/${d ?? 1}`;
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
      const kcal =
        entry.activeCaloriesKcal != null && entry.activeCaloriesKcal > 0
          ? entry.activeCaloriesKcal
          : undefined;
      const hr =
        entry.avgHeartRateBpm != null && entry.avgHeartRateBpm > 0
          ? entry.avgHeartRateBpm
          : undefined;

      if (kcal == null && hr == null) return;

      const sessionIndex = index + 1;
      const baseLabel = shortLabel(workout.date);
      rows.push({
        date: workout.date,
        xLabel:
          sessionIndex > 1 ? `${baseLabel} · #${sessionIndex}` : baseLabel,
        sortKey: parseDateKeyMs(workout.date) + index * 0.0001,
        sessionIndex: sessionIndex > 1 ? sessionIndex : undefined,
        activeCaloriesKcal: kcal,
        avgHeartRateBpm: hr,
      });
    });
  }

  rows.sort((a, b) => a.sortKey - b.sortKey);
  return rows;
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
      if (row.activeCaloriesKcal != null && row.activeCaloriesKcal > 0) {
        totalActiveKcal += row.activeCaloriesKcal;
        sessionsWithKcal += 1;
      }
      if (row.avgHeartRateBpm != null && row.avgHeartRateBpm > 0) {
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
