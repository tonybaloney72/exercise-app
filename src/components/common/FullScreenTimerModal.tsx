"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useFloatingTimerStore } from "@/stores/useFloatingTimerStore";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function FullScreenTimerModal() {
  const mode = useFloatingTimerStore((s) => s.mode);
  const running = useFloatingTimerStore((s) => s.running);
  const seconds = useFloatingTimerStore((s) => s.seconds);
  const restTotalSeconds = useFloatingTimerStore((s) => s.restTotalSeconds);
  const pause = useFloatingTimerStore((s) => s.pause);
  const resume = useFloatingTimerStore((s) => s.resume);
  const adjustRest = useFloatingTimerStore((s) => s.adjustRest);
  const resetRest = useFloatingTimerStore((s) => s.resetRest);
  const stop = useFloatingTimerStore((s) => s.stop);
  const tick = useFloatingTimerStore((s) => s.tick);

  const open = mode !== "idle";

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") stop();
      if (e.key === " ") {
        e.preventDefault();
        if (running) pause();
        else resume();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, running, pause, resume, stop]);

  useEffect(() => {
    if (!open || !running) return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [open, running, tick]);

  if (!open) return null;

  const isRest = mode === "rest";
  const progress =
    isRest && restTotalSeconds > 0 ? seconds / restTotalSeconds : 0;
  // Circle circumference for r=45 in a 100x100 viewBox.
  const RADIUS = 45;
  const CIRC = 2 * Math.PI * RADIUS;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={isRest ? "Rest timer" : "Stopwatch"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm px-6"
    >
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
        {isRest ? "Rest" : "Stopwatch"}
      </p>

      <div className="relative my-6 flex h-72 w-72 items-center justify-center">
        {isRest && (
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 -rotate-90"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="4"
            />
            <motion.circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className="text-accent"
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC * (1 - progress) }}
              animate={{ strokeDashoffset: CIRC * (1 - progress) }}
              transition={{ duration: 0.9, ease: "linear" }}
            />
          </svg>
        )}
        <span className="font-mono text-7xl font-bold tabular-nums text-white">
          {formatTime(seconds)}
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

      <div className="flex items-center gap-3">
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
            onClick={resume}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition-transform active:scale-95"
            aria-label="Resume"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={stop}
          className="rounded-full bg-white text-black px-6 py-3 text-sm font-bold transition-colors hover:bg-white/90"
        >
          Stop
        </button>
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
