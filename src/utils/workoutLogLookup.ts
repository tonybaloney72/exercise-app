import type { WorkoutLog } from "@/types";
import { resolveWorkoutCardioExercises } from "@/lib/resolveWorkoutCardio";
import { formatLocalDateKey } from "@/utils/localDateKey";

/** Logs with `endTime` set (excludes in-progress cloud drafts). */
export function filterCompletedWorkouts(history: WorkoutLog[]): WorkoutLog[] {
  return history.filter((w) => w.endTime != null);
}

function hasLoggedCardioSession(workout: WorkoutLog): boolean {
  return resolveWorkoutCardioExercises(workout).some(
    (row) =>
      row.completed &&
      !row.skipped &&
      ((row.actualDistanceMi != null && row.actualDistanceMi > 0) ||
        (row.actualDuration != null && row.actualDuration > 0) ||
        (row.stepCount != null && row.stepCount > 0) ||
        (row.activeCaloriesKcal != null && row.activeCaloriesKcal > 0)),
  );
}

/**
 * Workouts that should appear on Progress cardio charts — includes finished
 * workouts and in-progress days with at least one completed quick-log cardio row.
 */
export function filterWorkoutsForCardioProgress(
  history: WorkoutLog[],
): WorkoutLog[] {
  return history.filter(
    (workout) => workout.endTime != null || hasLoggedCardioSession(workout),
  );
}

/** Cardio chart history plus today's active session when it is not yet in history. */
export function workoutsForCardioProgressCharts(
  history: WorkoutLog[],
  activeWorkout: WorkoutLog | null,
): WorkoutLog[] {
  const base = filterWorkoutsForCardioProgress(history);
  if (
    activeWorkout &&
    !activeWorkout.endTime &&
    hasLoggedCardioSession(activeWorkout) &&
    !base.some((workout) => workout.id === activeWorkout.id)
  ) {
    return [...base, activeWorkout];
  }
  return base;
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
