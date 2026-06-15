import type { WorkoutLog } from "@/types";
import { workoutLogForPersistence } from "@/lib/workoutCardioPersistence";
import { upsertWorkoutInHistory } from "@/lib/inProgressWorkoutSync";
import { hydrateWorkoutLog } from "@/utils/exerciseLogDefaults";
import { getPausedWorkoutDateForToday } from "@/utils/workoutLogLookup";
import type { AuthMode } from "@/core";
import type { WorkoutCommandContext } from "@/use-cases/context";

export type CompleteWorkoutInput = {
  activeWorkout: WorkoutLog;
  workoutHistory: WorkoutLog[];
  todayKey: string;
  mode: AuthMode;
};

export type PreparedCompleteWorkout = {
  completed: WorkoutLog;
  workoutHistory: WorkoutLog[];
  pausedWorkoutDate: string | null;
};

export type CompleteWorkoutPersistInput = PreparedCompleteWorkout &
  WorkoutCommandContext;

export type CompleteWorkoutResult =
  | {
      ok: true;
      completed: WorkoutLog;
      workoutHistory: WorkoutLog[];
      pausedWorkoutDate: string | null;
    }
  | { ok: false; error: unknown };

/** Build the completed log and next history without persisting. */
export function prepareCompleteWorkout(
  input: CompleteWorkoutInput,
): PreparedCompleteWorkout {
  const authenticated = input.mode === "authenticated";
  const finished: WorkoutLog = {
    ...input.activeWorkout,
    endTime: new Date().toISOString(),
    paused: false,
  };
  const completed = hydrateWorkoutLog(workoutLogForPersistence(finished));
  const workoutHistory = upsertWorkoutInHistory(input.workoutHistory, completed);
  const pausedWorkoutDate = authenticated
    ? getPausedWorkoutDateForToday(workoutHistory, input.todayKey)
    : null;
  return { completed, workoutHistory, pausedWorkoutDate };
}

/** Persist a prepared completion to the workout repo. */
export async function persistCompletedWorkout(
  input: CompleteWorkoutPersistInput,
): Promise<CompleteWorkoutResult> {
  try {
    await input.workoutRepo.saveWorkout(input.completed);
    return {
      ok: true,
      completed: input.completed,
      workoutHistory: input.workoutHistory,
      pausedWorkoutDate: input.pausedWorkoutDate,
    };
  } catch (error) {
    return { ok: false, error };
  }
}

/** Finish an in-progress workout and persist it. */
export async function completeWorkout(
  input: CompleteWorkoutInput & WorkoutCommandContext,
): Promise<CompleteWorkoutResult> {
  const prepared = prepareCompleteWorkout(input);
  return persistCompletedWorkout({
    mode: input.mode,
    workoutRepo: input.workoutRepo,
    ...prepared,
  });
}
