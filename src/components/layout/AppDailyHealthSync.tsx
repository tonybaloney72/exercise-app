"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useDailyHealthStore } from "@/stores/useDailyHealthStore";
import { useDailyHealthRefreshListeners } from "@/hooks/useDailyHealthFromHealth";

/** Sync Health Connect daily metrics app-wide (not only on Progress). */
export default function AppDailyHealthSync() {
  const authMode = useAuthStore((s) => s.mode);
  const load = useDailyHealthStore((s) => s.load);

  useDailyHealthRefreshListeners();

  useEffect(() => {
    if (authMode === "loading") return;
    void load(authMode);
  }, [authMode, load]);

  return null;
}
