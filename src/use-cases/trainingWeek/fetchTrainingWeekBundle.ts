import type { AuthMode } from "@/core";
import type { TrainingWeekDays } from "@/lib/repos";

export type TrainingWeekBundle = {
  days: TrainingWeekDays;
  source: string | null;
};

/** Load a Sun–Sat week from plan resolution (repos + generator). */
export async function fetchTrainingWeekBundle(
  anchorKey: string,
  mode: AuthMode,
): Promise<TrainingWeekBundle> {
  const { resolveTrainingWeekBundleForAuth } = await import("@/lib/planResolver");
  return resolveTrainingWeekBundleForAuth(anchorKey, mode);
}
