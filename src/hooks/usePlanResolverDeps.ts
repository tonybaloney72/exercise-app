"use client";

import { selectEquipmentDependencyKey } from "@/lib/planResolverDeps";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTrainingWeekRefreshStore } from "@/stores/useTrainingWeekRefreshStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { UserSettings } from "@/types";

/** Auth mode, plan revision, and settings keys that invalidate plan resolution. */
export function usePlanResolverDeps(
  selectProgramProfileKey: (s: UserSettings) => string,
) {
  const mode = useAuthStore((s) => s.mode);
  const planRevision = useTrainingWeekRefreshStore((s) => s.planRevision);
  const equipmentKey = useSettingsStore(selectEquipmentDependencyKey);
  const programProfileKey = useSettingsStore(selectProgramProfileKey);
  return { mode, planRevision, equipmentKey, programProfileKey };
}
