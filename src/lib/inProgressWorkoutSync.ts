import type { WorkoutLog } from "@/types";
import { getWorkoutRepo } from "@/lib/repos";
import { workoutLogForPersistence } from "@/lib/workoutCardioPersistence";
import { hydrateWorkoutLog } from "@/utils/exerciseLogDefaults";
import { toastSaveError } from "@/utils/saveErrorToast";

const DEBOUNCE_MS = 250;

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistGeneration = 0;

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

export function schedulePersistInProgressWorkout(
  log: WorkoutLog,
  options: InProgressPersistOptions,
): void {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  const generation = ++persistGeneration;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void flushPersistInProgressWorkout(log, options, generation);
  }, DEBOUNCE_MS);
}

export function cancelScheduledPersistInProgressWorkout(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  persistGeneration++;
}

export async function flushPersistInProgressWorkout(
  log: WorkoutLog,
  options: InProgressPersistOptions,
  generation = persistGeneration,
): Promise<WorkoutLog | null> {
  cancelScheduledPersistInProgressWorkout();
  const prepared = prepareInProgressLog(log, options);
  try {
    await getWorkoutRepo("authenticated").saveWorkout(prepared);
    if (generation !== persistGeneration) return null;
    return prepared;
  } catch (err) {
    toastSaveError("workout progress", err);
    return null;
  }
}
