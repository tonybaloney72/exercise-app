"use client";

import { useEffect, useRef } from "react";
import {
  selectEquipmentDependencyKey,
  selectStretchDefaultsKey,
  selectTrainingWeekCacheKey,
} from "@/lib/planResolverDeps";
import { settingsHydrationMatchesAuth } from "@/lib/settingsHydration";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useTrainingWeekRefreshStore } from "@/stores/useTrainingWeekRefreshStore";
import { useTrainingWeekStore } from "@/stores/useTrainingWeekStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

/**
 * Preloads workout history and the current training week once per auth session
 * after settings hydrate. Tab pages read from these caches; avoid calling
 * `loadHistory()` / `ensureWeek()` on every remount unless data is stale.
 */
export default function AppDataSync() {
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id);
  const hydratedForAuthKey = useSettingsStore((s) => s.hydratedForAuthKey);
  const settingsHydrated = settingsHydrationMatchesAuth(
    mode,
    userId,
    hydratedForAuthKey,
  );
  const equipmentKey = useSettingsStore(selectEquipmentDependencyKey);
  const programProfileKey = useSettingsStore(selectTrainingWeekCacheKey);
  const stretchDefaultsKey = useSettingsStore(selectStretchDefaultsKey);
  const planRevision = useTrainingWeekRefreshStore((s) => s.planRevision);
  const prevAuthRef = useRef<string | null>(null);

  useEffect(() => {
    if (mode === "loading") return;
    const authKey =
      mode === "authenticated"
        ? userId
          ? `user:${userId}`
          : null
        : mode;
    if (authKey !== prevAuthRef.current) {
      useWorkoutStore.getState().invalidateHistory({ clearData: true });
      useTrainingWeekStore.getState().invalidate();
      prevAuthRef.current = authKey;
    }
  }, [mode, userId]);

  useEffect(() => {
    if (mode === "loading" || !settingsHydrated) return;
    void useWorkoutStore.getState().loadHistory();
    const todayKey = formatLocalDateKey(new Date());
    void useTrainingWeekStore.getState().ensureWeek(todayKey, mode, {
      planRevision,
      equipmentKey,
      programProfileKey,
      stretchDefaultsKey,
    });
  }, [
    mode,
    userId,
    settingsHydrated,
    planRevision,
    equipmentKey,
    programProfileKey,
    stretchDefaultsKey,
  ]);

  return null;
}
