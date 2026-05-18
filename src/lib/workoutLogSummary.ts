import type { DayPlan, ExerciseLog, WorkoutLog } from "@/types";

export type ExerciseSlotCounts = {
  total: number;
  completed: number;
  skipped: number;
};

export type WorkoutLogSummary = {
  strength: ExerciseSlotCounts;
  stretches: ExerciseSlotCounts;
  hasJog: boolean;
  jogCompleted: boolean;
  jogSkipped: boolean;
  jogDistance?: number;
  jogDurationSeconds?: number;
  startTimeLabel: string | null;
  endTimeLabel: string | null;
  durationLabel: string | null;
};

export function countExerciseSlots(logs: ExerciseLog[]): ExerciseSlotCounts {
  let completed = 0;
  let skipped = 0;
  for (const entry of logs) {
    if (entry.skipped) skipped += 1;
    else if (entry.completed) completed += 1;
  }
  return { total: logs.length, completed, skipped };
}

export function summarizeWorkoutLog(
  log: WorkoutLog,
  plan: DayPlan,
): WorkoutLogSummary {
  const strengthLogs = log.rounds.flatMap((r) => r.exercises);
  const stretchLogs = [...log.warmUpExercises, ...log.coolDownExercises];

  return {
    strength: countExerciseSlots(strengthLogs),
    stretches: countExerciseSlots(stretchLogs),
    hasJog: plan.hasJog,
    jogCompleted: log.jogCompleted,
    jogSkipped: log.jogSkipped,
    jogDistance: log.jogDistance,
    jogDurationSeconds: log.jogDurationSeconds,
    startTimeLabel: formatClockTime(log.startTime),
    endTimeLabel: formatClockTime(log.endTime),
    durationLabel: formatWorkoutDuration(log.startTime, log.endTime),
  };
}

function formatClockTime(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function formatWorkoutDuration(
  startIso: string | undefined,
  endIso: string | undefined,
): string | null {
  if (!startIso || !endIso) return null;
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;

  const totalSeconds = Math.round((end - start) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/** Share of slots that are completed (not skipped). */
export function completionRatio(counts: ExerciseSlotCounts): number {
  if (counts.total <= 0) return 0;
  return counts.completed / counts.total;
}
