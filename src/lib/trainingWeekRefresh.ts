import { refreshTrainingWeekContaining } from "@/lib/planResolver";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  useTrainingWeekRefreshStore,
  type TrainingWeekRefreshReason,
} from "@/stores/useTrainingWeekRefreshStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

/** Regenerate current Sun–Sat week (authenticated) and surface Slice 4 notice. */
export async function refreshCurrentTrainingWeek(
  reason: TrainingWeekRefreshReason,
): Promise<void> {
  if (useAuthStore.getState().mode !== "authenticated") return;
  await refreshTrainingWeekContaining(formatLocalDateKey());
  useTrainingWeekRefreshStore.getState().notifyRefreshed(reason);
}

/** Regenerate week containing `dateKey` and notify (drops custom edits). */
export async function resetTrainingWeekToGenerated(
  dateKeyInWeek: string,
): Promise<void> {
  if (useAuthStore.getState().mode !== "authenticated") return;
  const { resetTrainingWeekToGenerated: resetWeek } = await import(
    "@/lib/trainingWeekCustomize"
  );
  await resetWeek(dateKeyInWeek);
  useTrainingWeekRefreshStore.getState().notifyRefreshed("reset");
}

/** Refetch plan hooks after a custom day save (no banner). */
export function bumpTrainingWeekPlans(): void {
  useTrainingWeekRefreshStore.getState().bumpPlanRevision();
}
