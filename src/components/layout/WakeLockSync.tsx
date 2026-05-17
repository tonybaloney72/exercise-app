"use client";

import { useEffect, useRef } from "react";
import { useFloatingTimerStore } from "@/stores/useFloatingTimerStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Holds a screen wake lock while `keepScreenAwake` is on, or while a workout timer
 * is running, and the document is visible. Releases when the tab hides or timers stop.
 */
export default function WakeLockSync() {
  const keepScreenAwake = useSettingsStore((s) => s.keepScreenAwake);
  const timerMode = useFloatingTimerStore((s) => s.mode);
  const timerRunning = useFloatingTimerStore((s) => s.running);
  const holdForTimer = timerMode !== "idle" && timerRunning;
  const shouldHold = keepScreenAwake || holdForTimer;
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function release() {
      const lock = lockRef.current;
      lockRef.current = null;
      if (lock && !lock.released) {
        try {
          await lock.release();
        } catch {
          /* ignore */
        }
      }
    }

    async function acquire() {
      if (cancelled || !shouldHold) return;
      if (typeof document === "undefined" || document.visibilityState !== "visible") {
        return;
      }
      const wakeLock = typeof navigator !== "undefined" ? navigator.wakeLock : undefined;
      if (!wakeLock?.request) return;
      try {
        await release();
        const lock = await wakeLock.request("screen");
        if (cancelled) {
          if (!lock.released) await lock.release().catch(() => {});
          return;
        }
        lockRef.current = lock;
        lock.addEventListener("release", () => {
          if (lockRef.current === lock) lockRef.current = null;
        });
      } catch {
        /* denied, unsupported, or not visible */
      }
    }

    if (!shouldHold) {
      void release();
      return () => {
        cancelled = true;
        void release();
      };
    }

    void acquire();

    function onVisibility() {
      if (document.visibilityState === "visible") void acquire();
      else void release();
    }

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void release();
    };
  }, [shouldHold]);

  return null;
}
