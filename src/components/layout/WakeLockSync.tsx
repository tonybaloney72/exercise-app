"use client";

import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Holds a screen wake lock while `keepScreenAwake` is on and the document is visible.
 * Releases when the tab hides, the setting turns off, or the component unmounts.
 */
export default function WakeLockSync() {
  const keepScreenAwake = useSettingsStore((s) => s.keepScreenAwake);
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
      if (cancelled || !keepScreenAwake) return;
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

    if (!keepScreenAwake) {
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
  }, [keepScreenAwake]);

  return null;
}
