"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { BalanceAlert } from "@/lib/workoutBalanceAlerts";

/**
 * Toasts when new balance alerts appear while editing a day plan.
 * Skips the initial mount snapshot so opening the editor does not spam.
 */
export function useBalanceAlertToasts(alerts: BalanceAlert[]) {
  const seenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const ids = new Set(alerts.map((a) => a.id));

    if (seenIdsRef.current === null) {
      seenIdsRef.current = ids;
      return;
    }

    for (const alert of alerts) {
      if (seenIdsRef.current.has(alert.id)) continue;
      if (alert.severity === "warning") {
        toast.warning("Workout balance", { description: alert.message, duration: 7000 });
      } else {
        toast.info("Workout balance", { description: alert.message, duration: 5000 });
      }
    }

    seenIdsRef.current = ids;
  }, [alerts]);
}
