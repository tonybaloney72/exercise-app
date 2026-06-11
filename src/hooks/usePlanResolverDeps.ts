"use client";

import {
  selectEquipmentDependencyKey,
  selectTrainingWeekCacheKey,
} from "@/lib/planResolverDeps";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTrainingWeekRefreshStore } from "@/stores/useTrainingWeekRefreshStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/** Auth mode, plan revision, and settings keys that invalidate plan resolution. */
export function usePlanResolverDeps() {
  const mode = useAuthStore((s) => s.mode);
  const planRevision = useTrainingWeekRefreshStore((s) => s.planRevision);
  const equipmentKey = useSettingsStore(selectEquipmentDependencyKey);
  const programProfileKey = useSettingsStore(selectTrainingWeekCacheKey);
  return { mode, planRevision, equipmentKey, programProfileKey };
}
