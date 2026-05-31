"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import CountdownRing from "@/components/common/CountdownRing";
import { useFloatingTimerStore } from "@/stores/useFloatingTimerStore";
import { primeTimerAudio } from "@/utils/timerAlert";
import {
  countdownRingProgress,
  formatTimerDisplay,
} from "@/utils/time";

export default function FullScreenTimerModal() {
  const mode = useFloatingTimerStore((s) => s.mode);
  const running = useFloatingTimerStore((s) => s.running);
  const seconds = useFloatingTimerStore((s) => s.seconds);
  const restTotalSeconds = useFloatingTimerStore((s) => s.restTotalSeconds);
  const countdownRemainingMs = useFloatingTimerStore(
    (s) => s.countdownRemainingMs,
  );
  const pause = useFloatingTimerStore((s) => s.pause);
  const resume = useFloatingTimerStore((s) => s.resume);
  const adjustRest = useFloatingTimerStore((s) => s.adjustRest);
  const resetRest = useFloatingTimerStore((s) => s.resetRest);
  const resetStopwatch = useFloatingTimerStore((s) => s.resetStopwatch);
  const stop = useFloatingTimerStore((s) => s.stop);
  const minimizeTimer = useFloatingTimerStore((s) => s.minimizeTimer);

  const open = mode !== "idle";
  const panelRef = useRef<HTMLDivElement>(null);
  const isRest = mode === "rest";
  const isSetTimer = mode === "setTimer";
  const isCountdown = isRest || isSetTimer;
  const countdownComplete = isCountdown && !running && seconds === 0;

  useFocusTrap({
    open,
    containerRef: panelRef,
    onClose: stop,
    closeOnEscape: true,
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        if (countdownComplete) {
          primeTimerAudio();
          resetRest();
          return;
        }
        if (running) pause();
        else {
          primeTimerAudio();
          resume();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, running, pause, resume, countdownComplete, resetRest]);

  if (!open) return null;

  const progress =
    isCountdown && restTotalSeconds > 0
      ? countdownRingProgress(countdownRemainingMs, restTotalSeconds)
      : 0;

  const dialogLabel = isRest
    ? "Rest timer"
    : isSetTimer
      ? "Set timer"
      : "Stopwatch";

  const heading = isRest ? "Rest" : isSetTimer ? "Set timer" : "Stopwatch";

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm px-6"
    >
      {isCountdown && (
        <button
          type="button"
          onClick={minimizeTimer}
          aria-label="Minimize timer"
          className="absolute top-5 left-5 flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          Minimize
        </button>
      )}

      <button
        type="button"
        onClick={stop}
        aria-label="Close timer"
        className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
        {heading}
      </p>

      <div className="relative my-6 flex h-72 w-72 items-center justify-center">
        {isCountdown && (
          <CountdownRing
            className="absolute inset-0 h-full w-full"
            progress={progress}
            trackClassName="stroke-white/12"
            progressClassName="text-accent"
          />
        )}
        <span className="font-mono text-7xl font-bold tabular-nums text-white">
          {formatTimerDisplay(seconds)}
        </span>
      </div>

      {isRest && (
        <div className="mb-6 flex items-center gap-3">
          <AdjustButton onClick={() => adjustRest(-15)} label="-15s" />
          <button
            type="button"
            onClick={resetRest}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
          >
            Reset
          </button>
          <AdjustButton onClick={() => adjustRest(15)} label="+15s" />
        </div>
      )}

      {isSetTimer && (
        <div className="mb-6 flex justify-center">
          <button
            type="button"
            onClick={resetRest}
            className="rounded-full border border-white/20 px-5 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
          >
            Reset
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        {countdownComplete ? (
          <>
            <button
              type="button"
              onClick={() => {
                primeTimerAudio();
                resetRest();
              }}
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={stop}
              className="rounded-full bg-white text-black px-6 py-3 text-sm font-bold transition-colors hover:bg-white/90"
            >
              Close
            </button>
          </>
        ) : (
          <>
            {running ? (
              <button
                type="button"
                onClick={pause}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
                aria-label="Pause"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  primeTimerAudio();
                  resume();
                }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition-transform active:scale-95"
                aria-label="Resume"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
              </button>
            )}
            {isCountdown ? (
              <button
                type="button"
                onClick={stop}
                className="rounded-full bg-white text-black px-6 py-3 text-sm font-bold transition-colors hover:bg-white/90"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={resetStopwatch}
                className="rounded-full bg-white text-black px-6 py-3 text-sm font-bold transition-colors hover:bg-white/90"
              >
                Reset
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

function AdjustButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
    >
      {label}
    </button>
  );
}
