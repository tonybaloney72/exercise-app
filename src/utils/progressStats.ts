import type { TrainingWeekDays } from "@/lib/repos";
import type { DayPlan, ExerciseCategory, ExerciseLog, WorkoutLog } from "@/types";
import { exercises } from "@/data/exercises";
import { formatLocalDateKey } from "@/utils/localDateKey";
import {
  getSundayOfWeekContaining,
  parseLocalDateKey,
} from "@/utils/weekCalendar";
import {
  countCompletedRoundExercises,
  countRoundExerciseSlots,
} from "@/utils/workoutLogCounts";

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
  "PC",
]);

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dateKeyBetweenInclusive(key: string, start: Date, end: Date): boolean {
  const d = parseLocalDateKey(key);
  if (!d) return false;
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

interface WeeklyWorkoutPoint {
  /** Short label for axis */
  label: string;
  count: number;
}

/**
 * Last `numWeeks` calendar weeks (Sun–Sat), ending with the week that contains `reference`.
 */
function weeklyWorkoutCounts(
  history: WorkoutLog[],
  numWeeks: number,
  reference: Date = new Date(),
): WeeklyWorkoutPoint[] {
  const ref = new Date(reference);
  ref.setHours(12, 0, 0, 0);
  const thisWeekStart = getSundayOfWeekContaining(ref);

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

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function countPlannedRoundExercises(plan: DayPlan): number {
  return plan.rounds.reduce((sum, r) => sum + r.exercises.length, 0);
}

export interface WeekToDatePlanAdherence {
  planned: number;
  completed: number;
  /** Short label for the included slice, e.g. "Sun" or "Sun–Wed". */
  spanShort: string;
}

/**
 * Sum of prescribed main-round exercises for Sun..today (calendar week),
 * vs completed (non-skipped) round exercises logged on those dates.
 * Uses the newest log per date when multiple exist. Matches Progress "recent workouts" round counts.
 */
export function weekToDatePlanAdherence(
  history: WorkoutLog[],
  weekByDow: TrainingWeekDays | null,
  reference: Date = new Date(),
): WeekToDatePlanAdherence {
  const ref = new Date(reference);
  ref.setHours(12, 0, 0, 0);
  const todayDow = ref.getDay();
  const weekStart = new Date(ref);
  weekStart.setDate(ref.getDate() - todayDow);
  weekStart.setHours(0, 0, 0, 0);

  let planned = 0;
  let completed = 0;

  for (let dow = 0; dow <= todayDow; dow++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + dow);
    const dateStr = formatLocalDateKey(d);
    const plan = weekByDow?.[dow];
    const log = history.find((w) => w.date === dateStr);
    const planSlots = plan ? countPlannedRoundExercises(plan) : 0;
    if (log) {
      // Session edits (extra rounds/exercises) live on the log; don't show 59/47.
      const logSlots = countRoundExerciseSlots(log);
      planned += Math.max(planSlots, logSlots);
      completed += countCompletedRoundExercises(log);
    } else if (plan) {
      planned += planSlots;
    }
  }

  const spanShort =
    todayDow === 0
      ? DOW_SHORT[0]
      : `${DOW_SHORT[0]}–${DOW_SHORT[todayDow]}`;

  return { planned, completed, spanShort };
}
