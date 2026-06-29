import type { WorkoutLog } from "@/types";
import { resolveWorkoutCardioExercises } from "@/lib/resolveWorkoutCardio";
import { isMeaningfulCardioRow } from "@/lib/cardioRowMeaningful";
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
      isMeaningfulCardioRow(row),
  );
}

function hasStrengthOrStretchProgress(workout: WorkoutLog): boolean {
  if (workout.warmUpCompleted || workout.coolDownCompleted) return true;
  if (workout.warmUpExercises.some((e) => e.completed || e.skipped)) {
    return true;
  }
  if (workout.coolDownExercises.some((e) => e.completed || e.skipped)) {
    return true;
  }
  return workout.rounds.some((round) =>
    round.exercises.some(
      (e) =>
        e.completed ||
        e.skipped ||
        (e.actualReps != null && e.actualReps > 0) ||
        (e.actualDuration != null && e.actualDuration > 0),
    ),
  );
}

/** Quick-log cardio saved without starting warm-up, rounds, or cool-down. */
export function isCardioOnlyQuickLogWorkout(workout: WorkoutLog): boolean {
  return hasLoggedCardioSession(workout) && !hasStrengthOrStretchProgress(workout);
}

export function finalizeCardioOnlyQuickLogWorkout(
  workout: WorkoutLog,
  endTime: string = new Date().toISOString(),
): WorkoutLog {
  return {
    ...workout,
    endTime: workout.endTime ?? endTime,
    paused: false,
  };
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

/** Completed strength/stretch session — excludes cardio-only quick logs. */
export function findCompletedStrengthWorkoutForDate(
  workoutHistory: WorkoutLog[],
  dateKey: string,
): WorkoutLog | null {
  const completed = findCompletedWorkoutForDate(workoutHistory, dateKey);
  if (!completed || isCardioOnlyQuickLogWorkout(completed)) return null;
  return completed;
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

/** In-progress workout for a calendar day (`endTime` unset, same `date`). */
export function findInProgressWorkoutForDate(
  workoutHistory: WorkoutLog[],
  dateKey: string,
): WorkoutLog | null {
  return (
    workoutHistory.find((w) => w.endTime == null && w.date === dateKey) ?? null
  );
}

/** In-progress log for a day from history or the live session (not yet upserted). */
export function findInProgressWorkoutForDateIncludingActive(
  workoutHistory: WorkoutLog[],
  dateKey: string,
  activeWorkout: WorkoutLog | null,
): WorkoutLog | null {
  if (
    activeWorkout &&
    activeWorkout.endTime == null &&
    activeWorkout.date === dateKey
  ) {
    return activeWorkout;
  }
  return findInProgressWorkoutForDate(workoutHistory, dateKey);
}

/** Calendar date of the paused in-progress workout for today only (excludes stale prior-day sessions). */
export function getPausedWorkoutDateForToday(
  workoutHistory: WorkoutLog[],
  todayKey: string = formatLocalDateKey(),
): string | null {
  const paused = workoutHistory.find(
    (w) => w.endTime == null && w.paused && w.date === todayKey,
  );
  return paused?.date ?? null;
}

/** Finalize legacy in-progress cardio-only quick logs so they do not block Today. */
export function finalizeCardioOnlyQuickLogsInHistory(
  workoutHistory: WorkoutLog[],
): { history: WorkoutLog[]; changed: WorkoutLog[] } {
  const changed: WorkoutLog[] = [];
  const history = workoutHistory.map((log) => {
    if (log.endTime != null || !isCardioOnlyQuickLogWorkout(log)) return log;
    const finalized = finalizeCardioOnlyQuickLogWorkout(log);
    changed.push(finalized);
    return finalized;
  });
  return { history, changed };
}

/** Non-paused in-progress log for today - auto-resume on load (authenticated). */
export function shouldAutoRestoreInProgressFromHistory(
  workoutHistory: WorkoutLog[],
  todayKey: string,
): WorkoutLog | null {
  if (findCompletedStrengthWorkoutForDate(workoutHistory, todayKey)) return null;
  const inProgress = findInProgressWorkoutForDate(workoutHistory, todayKey);
  if (!inProgress || inProgress.paused || isCardioOnlyQuickLogWorkout(inProgress)) {
    return null;
  }
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
