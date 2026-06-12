import type { WorkoutLog } from "@/types";
import { formatLocalDateKey } from "@/utils/localDateKey";

/** Logs with `endTime` set (excludes in-progress cloud drafts). */
export function filterCompletedWorkouts(history: WorkoutLog[]): WorkoutLog[] {
  return history.filter((w) => w.endTime != null);
}

/** Finished workout for a calendar day (`endTime` set). */
export function findCompletedWorkoutForDate(
  workoutHistory: WorkoutLog[],
  dateKey: string,
): WorkoutLog | null {
  return (
    workoutHistory.find((w) => w.endTime != null && w.date === dateKey) ?? null
  );
}

/** In-progress workout for a calendar day (`endTime` unset, same `date`). */
export function findInProgressWorkoutForDate(
  workoutHistory: WorkoutLog[],
  dateKey: string,
): WorkoutLog | null {
  return (
    workoutHistory.find((w) => w.endTime == null && w.date === dateKey) ?? null
  );
}

/** Calendar date of the paused in-progress workout, if any. */
export function getPausedWorkoutDateFromHistory(
  workoutHistory: WorkoutLog[],
): string | null {
  const paused = workoutHistory.find((w) => w.endTime == null && w.paused);
  return paused?.date ?? null;
}

/** Paused in-progress draft for today only (excludes stale prior-day sessions). */
export function getPausedWorkoutDateForToday(
  workoutHistory: WorkoutLog[],
  todayKey: string = formatLocalDateKey(),
): string | null {
  const paused = workoutHistory.find(
    (w) => w.endTime == null && w.paused && w.date === todayKey,
  );
  return paused?.date ?? null;
}

/** Non-paused in-progress log for today - auto-resume on load (authenticated). */
export function shouldAutoRestoreInProgressFromHistory(
  workoutHistory: WorkoutLog[],
  todayKey: string,
): WorkoutLog | null {
  if (findCompletedWorkoutForDate(workoutHistory, todayKey)) return null;
  const inProgress = findInProgressWorkoutForDate(workoutHistory, todayKey);
  if (!inProgress || inProgress.paused) return null;
  return inProgress;
}

/**
 * @deprecated Prefer `findCompletedWorkoutForDate` or `findInProgressWorkoutForDate`.
 * Returns any log tied to the day (including in-progress).
 */
function findWorkoutLogForDate(
  workoutHistory: WorkoutLog[],
  dateKey: string,
): WorkoutLog | null {
  const byStoredDate = workoutHistory.find((w) => w.date === dateKey);
  if (byStoredDate) return byStoredDate;
  return (
    workoutHistory.find(
      (w) => w.endTime && formatLocalDateKey(new Date(w.endTime)) === dateKey,
    ) ?? null
  );
}
