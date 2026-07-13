import { useSettingsStore } from "@/stores/useSettingsStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { elapsedFromSetTimer } from "@/lib/setTimerElapsed";
import { vibrateOnExerciseComplete } from "@/utils/hapticFeedback";

/** Exercise that started a set countdown (not rest / stopwatch). */
export type SetTimerTarget =
  | { kind: "round"; roundNumber: number; exerciseId: string }
  | { kind: "warmUp"; exerciseId: string }
  | { kind: "coolDown"; exerciseId: string };
function completeRound(
  roundNumber: number,
  exerciseId: string,
  elapsed: number,
): void {
  const workout = useWorkoutStore.getState();
  const round = workout.activeWorkout?.rounds.find(
    (r) => r.roundNumber === roundNumber,
  );
  const log = round?.exercises.find((e) => e.exerciseId === exerciseId);
  if (!log || log.skipped) return;

  workout.setActualDuration(roundNumber, exerciseId, elapsed);
  if (!log.completed) {
    vibrateOnExerciseComplete();
    workout.toggleExercise(roundNumber, exerciseId);
  }
}

function completeWarmUp(exerciseId: string, elapsed: number): void {
  const workout = useWorkoutStore.getState();
  const log = workout.activeWorkout?.warmUpExercises.find(
    (e) => e.exerciseId === exerciseId,
  );
  if (!log || log.skipped) return;

  workout.setWarmUpStretchActualDuration(exerciseId, elapsed);
  if (!log.completed) {
    vibrateOnExerciseComplete();
    workout.toggleWarmUpStretch(exerciseId);
  }
}

function completeCoolDown(exerciseId: string, elapsed: number): void {
  const workout = useWorkoutStore.getState();
  const log = workout.activeWorkout?.coolDownExercises.find(
    (e) => e.exerciseId === exerciseId,
  );
  if (!log || log.skipped) return;

  workout.setCoolDownStretchActualDuration(exerciseId, elapsed);
  if (!log.completed) {
    vibrateOnExerciseComplete();
    workout.toggleCoolDownStretch(exerciseId);
  }
}

/**
 * When the setting is on, stopping a set timer fills “Did” and marks the
 * linked exercise complete (rounds, warm-up, or cool-down).
 */
export function applySetTimerStopCompletion(args: {
  target: SetTimerTarget;
  restTotalSeconds: number;
  secondsLeft: number;
}): void {
  if (!useSettingsStore.getState().completeExerciseOnSetTimerStop) return;
  if (!useWorkoutStore.getState().activeWorkout) return;

  const elapsed = elapsedFromSetTimer(
    args.restTotalSeconds,
    args.secondsLeft,
  );
  const { target } = args;

  if (target.kind === "round") {
    completeRound(target.roundNumber, target.exerciseId, elapsed);
    return;
  }
  if (target.kind === "warmUp") {
    completeWarmUp(target.exerciseId, elapsed);
    return;
  }
  completeCoolDown(target.exerciseId, elapsed);
}
