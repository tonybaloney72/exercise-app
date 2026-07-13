"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import CountdownRing from "@/components/common/CountdownRing";
import { useFloatingTimerStore } from "@/stores/useFloatingTimerStore";
import { primeTimerAudio } from "@/utils/timerAlert";
import { countdownRingProgress, formatTimerDisplay } from "@/utils/time";

function useTimerLayout(): { landscape: boolean; dialPx: number } {
  const [layout, setLayout] = useState({ landscape: false, dialPx: 320 });

  useEffect(() => {
    const sync = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const landscape =
        window.matchMedia("(orientation: landscape)").matches || w > h;
      // Portrait: large dial. Landscape: fit height, leave room for controls.
      const dialPx = landscape
        ? Math.max(
            220,
            Math.min(360, Math.floor(h * 0.72), Math.floor(w * 0.42)),
          )
        : Math.max(280, Math.min(340, Math.floor(w * 0.78)));
      setLayout({ landscape, dialPx });
    };
    sync();
    window.addEventListener("resize", sync);
    window
      .matchMedia("(orientation: landscape)")
      .addEventListener("change", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window
        .matchMedia("(orientation: landscape)")
        .removeEventListener("change", sync);
    };
  }, []);

  return layout;
}

type TimerControlVariant = "primary" | "solid" | "ghost";

const TIMER_CONTROL_VARIANTS: Record<TimerControlVariant, string> = {
  primary: "bg-accent text-white shadow-lg shadow-accent/30 hover:bg-accent/90",
  solid: "bg-white text-black hover:bg-white/90",
  ghost: "border border-white/30 text-white hover:bg-white/10",
};

function TimerControlButton({
  onClick,
  label,
  variant,
  icon,
}: {
  onClick: () => void;
  label: string;
  variant: TimerControlVariant;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors active:scale-[0.98] ${TIMER_CONTROL_VARIANTS[variant]}`}
    >
      {icon}
      {label}
    </button>
  );
}

function TimerIcon({
  children,
  className = "shrink-0",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center ${className}`}
    >
      {children}
    </span>
  );
}

function PlayIcon() {
  return (
    <TimerIcon>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <polygon points="6 4 20 12 6 20 6 4" />
      </svg>
    </TimerIcon>
  );
}

function PauseIcon() {
  return (
    <TimerIcon>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    </TimerIcon>
  );
}

function StopIcon() {
  return (
    <TimerIcon>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <rect x="7" y="7" width="10" height="10" rx="1.5" />
      </svg>
    </TimerIcon>
  );
}

function CloseIcon() {
  return (
    <TimerIcon>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </TimerIcon>
  );
}

function ResetIcon() {
  return (
    <TimerIcon>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </TimerIcon>
  );
}

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
  const hasStarted = useFloatingTimerStore((s) => s.hasStarted);

  const open = mode !== "idle";
  const panelRef = useRef<HTMLDivElement>(null);
  const { landscape, dialPx } = useTimerLayout();
  const isRest = mode === "rest";
  const isSetTimer = mode === "setTimer";
  const isCountdown = isRest || isSetTimer;
  const countdownComplete = isCountdown && !running && seconds === 0;
  const playLabel = hasStarted ? "Resume" : "Start";
  // Keep digits inside the ring for values like "10:00".
  const dialFontPx = Math.round(dialPx * 0.22);

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
      className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto bg-black/85 backdrop-blur-sm px-6 py-6"
    >
      {isCountdown && (
        <button
          type="button"
          onClick={minimizeTimer}
          aria-label="Minimize timer"
          className="absolute top-5 left-5 z-10 flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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
        className="absolute top-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
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

      <div
        className={`flex w-full items-center justify-center ${
          landscape
            ? "max-w-5xl flex-row gap-10 px-4"
            : "max-w-md flex-col gap-6"
        }`}
      >
        <div className="flex shrink-0 flex-col items-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
            {heading}
          </p>

          <div
            className="relative mt-4 flex shrink-0 items-center justify-center"
            style={{ width: dialPx, height: dialPx }}
          >
            {isCountdown && (
              <CountdownRing
                className="absolute inset-0 h-full w-full"
                progress={progress}
                trackClassName="stroke-white/12"
                progressClassName="text-accent"
              />
            )}
            <span
              className="font-mono font-bold tabular-nums leading-none text-white"
              style={{ fontSize: dialFontPx }}
            >
              {formatTimerDisplay(seconds)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-4">
          {isCountdown && (
            <div className="flex items-center justify-center gap-3">
              <AdjustButton onClick={() => adjustRest(-15)} label="-15s" />
              {!countdownComplete && (
                <TimerControlButton
                  onClick={resetRest}
                  label="Reset"
                  variant="ghost"
                  icon={<ResetIcon />}
                />
              )}
              <AdjustButton onClick={() => adjustRest(15)} label="+15s" />
            </div>
          )}

          <div className="flex items-center gap-3">
            {countdownComplete ? (
              <>
                <TimerControlButton
                  onClick={stop}
                  label="Close"
                  variant="solid"
                  icon={<CloseIcon />}
                />
                <TimerControlButton
                  onClick={() => {
                    primeTimerAudio();
                    resetRest();
                  }}
                  label="Restart"
                  variant="ghost"
                  icon={<ResetIcon />}
                />
              </>
            ) : (
              <>
                {isCountdown ? (
                  <TimerControlButton
                    onClick={stop}
                    label="Stop"
                    variant="solid"
                    icon={<StopIcon />}
                  />
                ) : (
                  <TimerControlButton
                    onClick={resetStopwatch}
                    label="Reset"
                    variant="solid"
                    icon={<ResetIcon />}
                  />
                )}
                {running ? (
                  <TimerControlButton
                    onClick={pause}
                    label="Pause"
                    variant="ghost"
                    icon={<PauseIcon />}
                  />
                ) : (
                  <TimerControlButton
                    onClick={() => {
                      primeTimerAudio();
                      resume();
                    }}
                    label={playLabel}
                    variant="primary"
                    icon={<PlayIcon />}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AdjustButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
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
