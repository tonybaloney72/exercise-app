import type { ExerciseCategory, ExerciseLog, WorkoutLog } from "@/types";
import { exercises } from "@/data/exercises";

const exerciseCategoryById = new Map(
  exercises.map((e) => [e.id, e.category] as const),
);

/** Strength / conditioning categories only (stretches excluded from balance). */
const TRAINING_CATEGORIES = new Set<ExerciseCategory>([
  "CF",
  "CL",
  "CR",
  "CS",
  "UP",
  "UPL",
  "LB",
  "CP",
]);

function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

function startOfLocalWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay();
  x.setDate(x.getDate() - dow);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dateKeyBetweenInclusive(key: string, start: Date, end: Date): boolean {
  const t = parseLocalDateKey(key).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export interface WeeklyWorkoutPoint {
  /** Short label for axis */
  label: string;
  count: number;
}

/**
 * Last `numWeeks` calendar weeks (Sun–Sat), ending with the week that contains `reference`.
 */
export function weeklyWorkoutCounts(
  history: WorkoutLog[],
  numWeeks: number,
  reference: Date = new Date(),
): WeeklyWorkoutPoint[] {
  const ref = new Date(reference);
  ref.setHours(12, 0, 0, 0);
  const thisWeekStart = startOfLocalWeek(ref);

  const points: WeeklyWorkoutPoint[] = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekStart = addDays(thisWeekStart, -i * 7);
    const weekEnd = addDays(weekStart, 6);
    weekEnd.setHours(23, 59, 59, 999);

    const count = history.filter((w) =>
      dateKeyBetweenInclusive(w.date, weekStart, weekEnd),
    ).length;

    const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    points.push({
      label: md(weekStart),
      count,
    });
  }
  return points;
}

function countCompletedTraining(
  ex: ExerciseLog,
  counts: Record<ExerciseCategory, number>,
): void {
  if (!ex.completed || ex.skipped) return;
  const cat = exerciseCategoryById.get(ex.exerciseId);
  if (!cat || !TRAINING_CATEGORIES.has(cat)) return;
  counts[cat] = (counts[cat] ?? 0) + 1;
}

/**
 * Completed round exercises by category (warm-up / cool-down stretches excluded).
 */
export function trainingCategoryTotals(history: WorkoutLog[]): {
  category: ExerciseCategory;
  value: number;
}[] {
  const counts = {} as Record<ExerciseCategory, number>;
  for (const w of history) {
    for (const r of w.rounds) {
      for (const ex of r.exercises) {
        countCompletedTraining(ex, counts);
      }
    }
  }

  return (Object.keys(counts) as ExerciseCategory[])
    .filter((c) => (counts[c] ?? 0) > 0)
    .map((category) => ({
      category,
      value: counts[category] ?? 0,
    }))
    .sort((a, b) => b.value - a.value);
}
