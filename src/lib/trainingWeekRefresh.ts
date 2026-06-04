import type { RefreshTrainingWeekScope } from "@/lib/trainingWeekRefreshScope";
import type { TrainingWeekRefreshReason } from "@/stores/useTrainingWeekRefreshStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

/** Regenerate current Sun–Sat week (authenticated) and toast + refetch plans. */
export async function refreshCurrentTrainingWeek(
  reason: TrainingWeekRefreshReason,
  scope: RefreshTrainingWeekScope = "prefs",
): Promise<void> {
  const { useAuthStore } = await import("@/stores/useAuthStore");
  if (useAuthStore.getState().mode !== "authenticated") return;
  const { refreshTrainingWeekContaining } = await import("@/lib/planResolver");
  await refreshTrainingWeekContaining(formatLocalDateKey(), scope);
  const { useTrainingWeekRefreshStore } = await import(
    "@/stores/useTrainingWeekRefreshStore"
  );
  useTrainingWeekRefreshStore.getState().notifyRefreshed(reason);
}

/** Rest / cardio schedule only — preserves custom week exercise picks. */
export async function refreshCurrentCustomWeekSchedule(): Promise<void> {
  const { useAuthStore } = await import("@/stores/useAuthStore");
  if (useAuthStore.getState().mode !== "authenticated") return;
  const { refreshCustomWeekSchedule } = await import("@/lib/planResolver");
  await refreshCustomWeekSchedule(formatLocalDateKey());
  const { useTrainingWeekRefreshStore } = await import(
    "@/stores/useTrainingWeekRefreshStore"
  );
  useTrainingWeekRefreshStore.getState().bumpPlanRevision();
}

/** Regenerate week containing `dateKey` and notify (drops custom edits). */
export async function resetTrainingWeekToGenerated(
  dateKeyInWeek: string,
): Promise<void> {
  const { useAuthStore } = await import("@/stores/useAuthStore");
  if (useAuthStore.getState().mode !== "authenticated") return;
  const { resetTrainingWeekToGenerated: resetWeek } = await import(
    "@/lib/trainingWeekCustomize"
  );
  await resetWeek(dateKeyInWeek);
  const { useTrainingWeekRefreshStore } = await import(
    "@/stores/useTrainingWeekRefreshStore"
  );
  useTrainingWeekRefreshStore.getState().notifyRefreshed("reset");
}

/** Regenerate a single day in the current week and refetch plan hooks (no banner). */
export async function resetTrainingDayToGenerated(
  dateKey: string,
): Promise<void> {
  const { useAuthStore } = await import("@/stores/useAuthStore");
  if (useAuthStore.getState().mode !== "authenticated") return;
  const { resetDayToGenerated } = await import("@/lib/trainingWeekCustomize");
  await resetDayToGenerated(dateKey);
  bumpTrainingWeekPlans();
}

/** Refetch plan hooks after a custom day save (no banner). */
export function bumpTrainingWeekPlans(): void {
  void import("@/stores/useTrainingWeekRefreshStore").then(
    ({ useTrainingWeekRefreshStore }) => {
      useTrainingWeekRefreshStore.getState().bumpPlanRevision();
    },
  );
}
