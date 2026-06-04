import type { PrescribedPlanFreezeState } from "@/lib/workoutSessionGuard";

const emptyFreezeState: PrescribedPlanFreezeState = {
  activeWorkout: null,
  pausedWorkoutDate: null,
  workoutHistory: [],
};

let readFreezeState: () => PrescribedPlanFreezeState = () => emptyFreezeState;

/** Registered by `useWorkoutStore` on the client so plan regen can respect in-progress days. */
export function registerPrescribedPlanFreezeStateReader(
  reader: () => PrescribedPlanFreezeState,
): void {
  readFreezeState = reader;
}

export function getPrescribedPlanFreezeState(): PrescribedPlanFreezeState {
  return readFreezeState();
}
