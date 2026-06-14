"use client";

import { useEffect } from "react";
import { settingsHydrationKey } from "@/lib/settingsHydration";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

/**
 * Loads workout history only when the store is not fresh for this auth session.
 * Prefer `AppDataSync` for initial preload; use this on routes that need history
 * before AppDataSync finishes (sub-routes) without re-fetching on every tab remount.
 */
export function useEnsureHistoryLoaded(): void {
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id);
  const historyLoadedForAuthKey = useWorkoutStore(
    (s) => s.historyLoadedForAuthKey,
  );
  const loadHistory = useWorkoutStore((s) => s.loadHistory);

  useEffect(() => {
    if (mode === "loading") return;
    const authKey = settingsHydrationKey(mode, userId);
    if (!authKey || historyLoadedForAuthKey === authKey) return;
    void loadHistory();
  }, [mode, userId, historyLoadedForAuthKey, loadHistory]);
}
