"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFloatingTimerStore } from "@/stores/useFloatingTimerStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { formatTimerDisplay } from "@/utils/time";
import FullScreenTimerModal from "./FullScreenTimerModal";

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
  const pillLabel = hasLast ? formatTimerDisplay(lastStopwatchSeconds!) : "Timer";

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
                className="absolute right-0 mt-2 flex w-55 flex-col gap-2"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    startRest(restBetweenRounds, false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-full bg-accent px-4 py-2.5 text-left text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent/90 active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0 opacity-90"
                      aria-hidden
                    >
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    Rest timer
                  </span>
                  <span className="tabular-nums text-xs font-semibold text-white/85">
                    {formatTimerDisplay(restBetweenRounds)}
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    startStopwatch(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-full bg-accent px-4 py-2.5 text-left text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent/90 active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0 opacity-90"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="9" />
                      <polyline points="12 7 12 12 15 14" />
                    </svg>
                    Stopwatch
                  </span>
                  {hasLast ? (
                    <span className="text-right text-xs font-medium leading-tight text-white/80">
                      Resume
                      <span className="ml-1 tabular-nums text-white/90">
                        {formatTimerDisplay(lastStopwatchSeconds!)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-white/75">From 0:00</span>
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
