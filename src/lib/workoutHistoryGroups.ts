import { formatWorkoutDuration } from "@/lib/workoutLogSummary";
import type { WorkoutLog } from "@/types";
import { filterCompletedWorkouts } from "@/utils/workoutLogLookup";
import { parseLocalDateKey } from "@/utils/localDateKey";

export type WorkoutHistoryMonthGroup = {
  monthKey: string;
  label: string;
  logs: WorkoutLog[];
};

export type WorkoutHistoryRowMeta = {
  exercisesDone: number;
  exercisesTotal: number;
  durationLabel: string | null;
};

export function workoutHistoryRowMeta(log: WorkoutLog): WorkoutHistoryRowMeta {
  const exercisesDone = log.rounds.reduce(
    (a, r) => a + r.exercises.filter((e) => e.completed).length,
    0,
  );
  const exercisesTotal = log.rounds.reduce((a, r) => a + r.exercises.length, 0);
  return {
    exercisesDone,
    exercisesTotal,
    durationLabel: formatWorkoutDuration(log.startTime, log.endTime),
  };
}

/** Group completed logs by calendar month (`log.date`), newest months and days first. */
export function groupCompletedWorkoutsByMonth(
  history: WorkoutLog[],
): WorkoutHistoryMonthGroup[] {
  const completed = filterCompletedWorkouts(history);
  const byMonth = new Map<string, WorkoutLog[]>();

  for (const log of completed) {
    const monthKey = log.date.slice(0, 7);
    const bucket = byMonth.get(monthKey) ?? [];
    bucket.push(log);
    byMonth.set(monthKey, bucket);
  }

  return [...byMonth.entries()]
    .map(([monthKey, logs]) => {
      const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
      const sample = parseLocalDateKey(`${monthKey}-01`);
      const label = sample
        ? sample.toLocaleDateString(undefined, { month: "long", year: "numeric" })
        : monthKey;
      return { monthKey, label, logs: sorted };
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export function formatWorkoutHistoryDayLabel(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return dateKey;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatCompletedBannerTitle(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return "Completed";
  const label = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `Completed · ${label}`;
}
