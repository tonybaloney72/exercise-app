import { compareDateKeyToRef } from "@/lib/workoutHistoryCalendar";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { parseLocalDateKey } from "@/utils/weekCalendar";
import type { WorkoutLog } from "@/types";

export function isInProgressWorkoutLog(log: WorkoutLog): boolean {
  return log.endTime == null;
}

/** In-progress session tied to a calendar day before `todayKey`. */
export function isStaleSessionDate(
  sessionDateKey: string,
  todayKey: string = formatLocalDateKey(),
): boolean {
  if (!parseLocalDateKey(sessionDateKey)) return false;
  return compareDateKeyToRef(sessionDateKey, todayKey) === "past";
}

/** In-progress logs from prior calendar days (paused or not). Newest first. */
export function findStaleInProgressSessions(
  workoutHistory: WorkoutLog[],
  todayKey: string = formatLocalDateKey(),
): WorkoutLog[] {
  return workoutHistory
    .filter((w) => isInProgressWorkoutLog(w) && isStaleSessionDate(w.date, todayKey))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Mark past in-progress rows as paused so they never auto-resume on a new day. */
export function pauseStaleInProgressLogs(
  workoutHistory: WorkoutLog[],
  todayKey: string = formatLocalDateKey(),
): { history: WorkoutLog[]; changedIds: string[] } {
  const changedIds: string[] = [];
  const history = workoutHistory.map((w) => {
    if (!isInProgressWorkoutLog(w) || !isStaleSessionDate(w.date, todayKey) || w.paused) {
      return w;
    }
    changedIds.push(w.id);
    return { ...w, paused: true };
  });
  return { history, changedIds };
}

export function formatStaleSessionDateLabel(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return dateKey;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
