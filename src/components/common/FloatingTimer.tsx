"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFloatingTimerStore } from "@/stores/useFloatingTimerStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import FullScreenTimerModal from "./FullScreenTimerModal";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Floating pill in the top-right that:
 *   - Shows "Timer" by default
 *   - After a stopwatch run, shows the captured time until dismissed
 *   - Opens a small popover with two options (Rest / Stopwatch)
 *   - Renders the full-screen modal while the timer is active
 */
export default function FloatingTimer() {
  const mode = useFloatingTimerStore((s) => s.mode);
  const startRest = useFloatingTimerStore((s) => s.startRest);
  const startStopwatch = useFloatingTimerStore((s) => s.startStopwatch);
  const lastStopwatchSeconds = useFloatingTimerStore(
    (s) => s.lastStopwatchSeconds,
  );
  const dismissLast = useFloatingTimerStore((s) => s.dismissLast);
  const restBetweenRounds = useSettingsStore((s) => s.restBetweenRounds);

  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const idle = mode === "idle";
  const hasLast = lastStopwatchSeconds != null;
  const pillLabel = hasLast ? formatTime(lastStopwatchSeconds!) : "Timer";

  return (
    <>
      {idle && (
        <div className="fixed top-4 right-4 z-40" ref={popoverRef}>
          <div className="flex items-center gap-1.5 rounded-full bg-accent shadow-lg shadow-accent/30">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex items-center gap-2 pl-3.5 pr-3 py-2.5 text-sm font-semibold text-white active:scale-[0.97] transition-transform"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 14" />
              </svg>
              <span className="tabular-nums">{pillLabel}</span>
            </button>
            {hasLast && (
              <button
                type="button"
                onClick={dismissLast}
                aria-label="Dismiss last time"
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors mr-1"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                role="menu"
                className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    startRest(restBetweenRounds, false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-foreground hover:bg-surface-hover transition-colors"
                >
                  <span className="font-medium">Rest</span>
                  <span className="text-xs tabular-nums text-muted">
                    {formatTime(restBetweenRounds)}
                  </span>
                </button>
                <div className="h-px bg-border" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    startStopwatch(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-foreground hover:bg-surface-hover transition-colors"
                >
                  <span className="font-medium">Stopwatch</span>
                  {hasLast && (
                    <span className="text-xs tabular-nums text-muted">
                      resume {formatTime(lastStopwatchSeconds!)}
                    </span>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>{!idle && <FullScreenTimerModal />}</AnimatePresence>
    </>
  );
}
