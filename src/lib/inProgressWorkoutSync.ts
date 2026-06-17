import type { WorkoutLog } from "@/types";
import { getWorkoutRepo } from "@/lib/repos";
import { clientTraceAsync } from "@/lib/diagnostics/clientTrace";
import { workoutLogForPersistence } from "@/lib/workoutCardioPersistence";
import { hydrateWorkoutLog } from "@/utils/exerciseLogDefaults";
import { toastSaveError } from "@/utils/saveErrorToast";

const DEBOUNCE_MS = 250;

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistGeneration = 0;
/** While set, in-progress cloud saves for this workout id are skipped (completion in flight). */
let completingWorkoutId: string | null = null;

export type InProgressPersistOptions = {
  paused: boolean;
};

function prepareInProgressLog(
  log: WorkoutLog,
  options: InProgressPersistOptions,
): WorkoutLog {
  return hydrateWorkoutLog(
    workoutLogForPersistence({
      ...log,
      endTime: undefined,
      paused: options.paused,
    }),
  );
}

export function upsertWorkoutInHistory(
  history: WorkoutLog[],
  log: WorkoutLog,
): WorkoutLog[] {
  const without = history.filter((w) => w.id !== log.id);
  return [log, ...without];
}

/** Invalidate scheduled and in-flight in-progress persists (e.g. before complete). */
export function invalidateInProgressPersists(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  persistGeneration++;
}

export function markWorkoutCompleting(workoutId: string): void {
  completingWorkoutId = workoutId;
  invalidateInProgressPersists();
}

export function clearWorkoutCompleting(workoutId: string): void {
  if (completingWorkoutId === workoutId) {
    completingWorkoutId = null;
  }
}

function shouldSkipInProgressPersist(
  log: WorkoutLog,
  generation: number,
): boolean {
  if (generation !== persistGeneration) return true;
  if (completingWorkoutId === log.id) return true;
  return false;
}

export function schedulePersistInProgressWorkout(
  log: WorkoutLog,
  options: InProgressPersistOptions,
): void {
  if (typeof window === "undefined") return;
  if (completingWorkoutId === log.id) return;
  if (persistTimer) clearTimeout(persistTimer);
  const generation = ++persistGeneration;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void flushPersistInProgressWorkout(log, options, generation);
  }, DEBOUNCE_MS);
}

/** @deprecated Prefer `invalidateInProgressPersists` */
export function cancelScheduledPersistInProgressWorkout(): void {
  invalidateInProgressPersists();
}

export async function flushPersistInProgressWorkout(
  log: WorkoutLog,
  options: InProgressPersistOptions,
  generation = persistGeneration,
): Promise<WorkoutLog | null> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  if (shouldSkipInProgressPersist(log, generation)) {
    return null;
  }

  const prepared = prepareInProgressLog(log, options);

  if (shouldSkipInProgressPersist(log, generation)) {
    return null;
  }

  try {
    await clientTraceAsync(
      "workout-repo",
      "flushInProgressWorkout",
      () => getWorkoutRepo("authenticated").saveWorkout(prepared),
      { workoutId: log.id, date: log.date, paused: options.paused },
    );
    if (shouldSkipInProgressPersist(log, generation)) {
      return null;
    }
    return prepared;
  } catch (err) {
    toastSaveError("workout progress", err);
    return null;
  }
}
