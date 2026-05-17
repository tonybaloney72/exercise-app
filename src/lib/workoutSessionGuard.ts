import { useWorkoutStore } from "@/stores/useWorkoutStore";

/** True when the user has started (or paused) a workout for this calendar date. */
export function isWorkoutStartedForDate(dateKey: string): boolean {
  if (typeof window === "undefined") return false;
  const { activeWorkout, pausedWorkoutDate } = useWorkoutStore.getState();
  return activeWorkout?.date === dateKey || pausedWorkoutDate === dateKey;
}
