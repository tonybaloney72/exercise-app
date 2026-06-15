import type { AuthMode } from "@/core";
import type { WorkoutRepo } from "@/lib/repos";

/** Injected workout persistence for use-cases (no Zustand). */
export type WorkoutCommandContext = {
  mode: AuthMode;
  workoutRepo: WorkoutRepo;
};
