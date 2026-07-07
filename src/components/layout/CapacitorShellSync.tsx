"use client";

import { useEffect, useState } from "react";
import { isNativePlatform } from "@/lib/capacitorRuntime";

/**
 * Native shell housekeeping: dismiss Capacitor splash overlay and surface dev
 * script errors on-device (no desktop console in the emulator).
 */
export default function CapacitorShellSync() {
  const [devError, setDevError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNativePlatform()) return;

    void import("@capacitor/splash-screen").then(({ SplashScreen }) =>
      SplashScreen.hide().catch(() => {}),
    );

    if (process.env.NODE_ENV !== "development") return;

    function capture(message: string) {
      setDevError((prev) => prev ?? message.slice(0, 500));
    }

    function onError(event: ErrorEvent) {
      capture(event.message || "Unknown script error");
    }

    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      capture(reason instanceof Error ? reason.message : String(reason));
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (process.env.NODE_ENV !== "development" || !devError) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-100 border-b border-red-500/40 bg-red-950/95 px-4 py-3 text-xs leading-snug text-red-100"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <p className="font-semibold">Dev error (native WebView)</p>
      <p className="mt-1 break-words font-mono">{devError}</p>
    </div>
  );
}
