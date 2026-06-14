"use client";

import { settingsHydrationKey } from "@/lib/settingsHydration";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

/** False while auth is settling or workout history has not loaded for this session. */
export function useHistoryReady(): boolean {
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id);
  const historyLoadedForAuthKey = useWorkoutStore(
    (s) => s.historyLoadedForAuthKey,
  );

  if (mode === "loading") return false;
  const authKey = settingsHydrationKey(mode, userId);
  if (!authKey) return false;
  return historyLoadedForAuthKey === authKey;
}
