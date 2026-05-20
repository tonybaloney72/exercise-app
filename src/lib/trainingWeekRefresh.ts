import {
  refreshCustomWeekSchedule,
  refreshTrainingWeekContaining,
} from "@/lib/planResolver";
import type { RefreshTrainingWeekScope } from "@/lib/planResolver";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import {
  useTrainingWeekRefreshStore,
  type TrainingWeekRefreshReason,
} from "@/stores/useTrainingWeekRefreshStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

/** Regenerate current Sun–Sat week (authenticated) and toast + refetch plans. */
export async function refreshCurrentTrainingWeek(
  reason: TrainingWeekRefreshReason,
  scope: RefreshTrainingWeekScope = "prefs",
): Promise<void> {
  if (useAuthStore.getState().mode !== "authenticated") return;
  await useWorkoutStore.getState().loadHistory();
  await refreshTrainingWeekContaining(formatLocalDateKey(), scope);
  useTrainingWeekRefreshStore.getState().notifyRefreshed(reason);
}

/** Rest / cardio schedule only — preserves custom week exercise picks. */
export async function refreshCurrentCustomWeekSchedule(): Promise<void> {
  if (useAuthStore.getState().mode !== "authenticated") return;
  await refreshCustomWeekSchedule(formatLocalDateKey());
  useTrainingWeekRefreshStore.getState().bumpPlanRevision();
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

/** Regenerate a single day in the current week and refetch plan hooks (no banner). */
export async function resetTrainingDayToGenerated(
  dateKey: string,
): Promise<void> {
  if (useAuthStore.getState().mode !== "authenticated") return;
  const { resetDayToGenerated } = await import("@/lib/trainingWeekCustomize");
  await resetDayToGenerated(dateKey);
  bumpTrainingWeekPlans();
}

/** Refetch plan hooks after a custom day save (no banner). */
export function bumpTrainingWeekPlans(): void {
  useTrainingWeekRefreshStore.getState().bumpPlanRevision();
}
