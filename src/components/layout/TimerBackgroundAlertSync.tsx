"use client";

import { useEffect } from "react";
import { useFloatingTimerStore } from "@/stores/useFloatingTimerStore";
import {
  registerTimerBackgroundAlertListeners,
  syncTimerBackgroundNotification,
} from "@/lib/timerBackgroundAlert";
import { isNativePlatform } from "@/lib/capacitorRuntime";

/**
 * Schedules native local notifications for running countdown timers so rest/set
 * alerts still fire when the Android app is backgrounded.
 */
export default function TimerBackgroundAlertSync() {
  const mode = useFloatingTimerStore((s) => s.mode);
  const running = useFloatingTimerStore((s) => s.running);
  const countdownEndsAtMs = useFloatingTimerStore((s) => s.countdownEndsAtMs);

  useEffect(() => {
    if (!isNativePlatform()) return;
    let removeListeners: (() => void) | undefined;
    void (async () => {
      try {
        removeListeners = await registerTimerBackgroundAlertListeners();
      } catch {
        /* plugin unavailable */
      }
    })();
    return () => {
      removeListeners?.();
    };
  }, []);

  useEffect(() => {
    void syncTimerBackgroundNotification({
      mode,
      running,
      countdownEndsAtMs,
    });
  }, [mode, running, countdownEndsAtMs]);

  return null;
}
