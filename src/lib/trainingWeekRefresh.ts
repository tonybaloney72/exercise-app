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
