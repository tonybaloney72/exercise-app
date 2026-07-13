"use client";

import { create } from "zustand";
import { primeTimerAudio } from "@/utils/timerAlert";
import {
  cancelTimerBackgroundNotification,
  completeTimerCountdown,
  resetTimerCompletionTracking,
} from "@/lib/timerBackgroundAlert";
import {
  applySetTimerStopCompletion,
  type SetTimerTarget,
} from "@/lib/setTimerCompleteOnStop";
import { displayCountdownSeconds } from "@/utils/time";

export type TimerMode = "idle" | "rest" | "stopwatch" | "setTimer";
export type { SetTimerTarget };
type TimerPresentation = "fullscreen" | "minimized";

interface FloatingTimerState {
  mode: TimerMode;
  presentation: TimerPresentation;
  running: boolean;
  /** Countdown: seconds left. Stopwatch: seconds elapsed. */
  seconds: number;
  /** Only meaningful for `rest` and `setTimer`. Used to render progress. */
  restTotalSeconds: number;
  /**
   * Final elapsed time from the most recent stopwatch run. Surfaced as the
   * idle pill label so the user can capture the value before dismissing it.
   * Cleared on dismiss or when a new stopwatch run starts.
   */
  lastStopwatchSeconds: number | null;
  /** Wall-clock ms when an active countdown reaches zero. */
  countdownEndsAtMs: number | null;
  /** Continuous ms left (running: wall clock; paused: frozen). Drives ring progress. */
  countdownRemainingMs: number;
  /** Wall-clock ms when the current stopwatch segment started (null while paused). */
  stopwatchStartedAtMs: number | null;
  /** Elapsed seconds accumulated before the current stopwatch segment. */
  stopwatchBaseSeconds: number;
  /** True once the user has started the current timer session (running or paused). */
  hasStarted: boolean;
  /** Set-timer only: which exercise to complete when the user stops/closes. */
  setTimerTarget: SetTimerTarget | null;

  startRest: (totalSeconds: number, autoStart?: boolean) => void;
  startSetCountdown: (
    totalSeconds: number,
    target?: SetTimerTarget | null,
  ) => void;
  startStopwatch: (autoStart?: boolean) => void;
  pause: () => void;
  resume: () => void;
  adjustRest: (deltaSeconds: number) => void;
  resetRest: () => void;
  resetStopwatch: () => void;
  stop: () => void;
  dismissLast: () => void;
  minimizeTimer: () => void;
  expandTimer: () => void;
  /** Recompute display from wall clock (screen lock / background safe). */
  syncTimerClock: () => void;
}

function countdownEndsAtFromSeconds(seconds: number): number {
  return Date.now() + Math.max(0, seconds) * 1000;
}

function clearClockFields() {
  return {
    countdownEndsAtMs: null as number | null,
    countdownRemainingMs: 0,
    stopwatchStartedAtMs: null as number | null,
    stopwatchBaseSeconds: 0,
  };
}

export const useFloatingTimerStore = create<FloatingTimerState>((set, get) => ({
  mode: "idle",
  presentation: "fullscreen",
  running: false,
  seconds: 0,
  restTotalSeconds: 0,
  lastStopwatchSeconds: null,
  countdownEndsAtMs: null,
  countdownRemainingMs: 0,
  stopwatchStartedAtMs: null,
  stopwatchBaseSeconds: 0,
  hasStarted: false,
  setTimerTarget: null,

  startRest: (totalSeconds, autoStart = true) => {
    primeTimerAudio();
    resetTimerCompletionTracking();
    const seconds = Math.max(0, Math.floor(totalSeconds));
    set({
      mode: "rest",
      presentation: "fullscreen",
      running: autoStart,
      seconds,
      restTotalSeconds: seconds,
      lastStopwatchSeconds: null,
      countdownEndsAtMs: autoStart ? countdownEndsAtFromSeconds(seconds) : null,
      countdownRemainingMs: seconds * 1000,
      stopwatchStartedAtMs: null,
      stopwatchBaseSeconds: 0,
      hasStarted: autoStart,
      setTimerTarget: null,
    });
  },

  startSetCountdown: (totalSeconds, target = null) => {
    primeTimerAudio();
    resetTimerCompletionTracking();
    const seconds = Math.max(0, Math.floor(totalSeconds));
    set({
      mode: "setTimer",
      presentation: "fullscreen",
      running: true,
      seconds,
      restTotalSeconds: seconds,
      lastStopwatchSeconds: null,
      countdownEndsAtMs: countdownEndsAtFromSeconds(seconds),
      countdownRemainingMs: seconds * 1000,
      stopwatchStartedAtMs: null,
      stopwatchBaseSeconds: 0,
      hasStarted: true,
      setTimerTarget: target ?? null,
    });
  },

  startStopwatch: (autoStart = true) =>
    set((s) => {
      const base = s.lastStopwatchSeconds ?? 0;
      return {
        mode: "stopwatch",
        presentation: "fullscreen",
        running: autoStart,
        seconds: base,
        restTotalSeconds: 0,
        lastStopwatchSeconds: null,
        countdownEndsAtMs: null,
        stopwatchBaseSeconds: base,
        stopwatchStartedAtMs: autoStart ? Date.now() : null,
        hasStarted: autoStart,
        setTimerTarget: null,
      };
    }),

  pause: () =>
    set((s) => {
      if (!s.running) return s;
      if (s.mode === "rest" || s.mode === "setTimer") {
        if (s.countdownEndsAtMs != null) {
          const remainingMs = Math.max(0, s.countdownEndsAtMs - Date.now());
          const left = displayCountdownSeconds(remainingMs);
          return {
            running: false,
            seconds: left,
            countdownEndsAtMs: null,
            countdownRemainingMs: remainingMs,
          };
        }
        return { running: false };
      }
      if (s.mode === "stopwatch" && s.stopwatchStartedAtMs != null) {
        const elapsed =
          s.stopwatchBaseSeconds +
          Math.floor((Date.now() - s.stopwatchStartedAtMs) / 1000);
        return {
          running: false,
          seconds: elapsed,
          stopwatchBaseSeconds: elapsed,
          stopwatchStartedAtMs: null,
        };
      }
      return { running: false };
    }),

  resume: () =>
    set((s) => {
      if (s.mode === "rest" || s.mode === "setTimer") {
        const seconds =
          s.seconds <= 0 && s.restTotalSeconds > 0
            ? s.restTotalSeconds
            : s.seconds;
        return {
          running: true,
          seconds,
          countdownEndsAtMs: countdownEndsAtFromSeconds(seconds),
          countdownRemainingMs: seconds * 1000,
          hasStarted: true,
        };
      }
      if (s.mode === "stopwatch") {
        return {
          running: true,
          stopwatchStartedAtMs: Date.now(),
          hasStarted: true,
        };
      }
      return { running: true, hasStarted: true };
    }),

  adjustRest: (deltaSeconds) =>
    set((s) => {
      if (s.mode !== "rest" && s.mode !== "setTimer") return s;
      const next = Math.max(0, s.seconds + deltaSeconds);
      const total = Math.max(s.restTotalSeconds, next);
      const nextEndsAt =
        s.running && s.countdownEndsAtMs != null
          ? s.countdownEndsAtMs + deltaSeconds * 1000
          : s.running
            ? countdownEndsAtFromSeconds(next)
            : null;
      return {
        seconds: next,
        restTotalSeconds: total,
        countdownEndsAtMs: nextEndsAt,
        countdownRemainingMs:
          nextEndsAt != null
            ? Math.max(0, nextEndsAt - Date.now())
            : next * 1000,
      };
    }),

  resetRest: () =>
    set((s) => {
      if (s.mode !== "rest" && s.mode !== "setTimer") return s;
      return {
        seconds: s.restTotalSeconds,
        running: true,
        countdownEndsAtMs: countdownEndsAtFromSeconds(s.restTotalSeconds),
        countdownRemainingMs: s.restTotalSeconds * 1000,
        hasStarted: true,
      };
    }),

  resetStopwatch: () =>
    set((s) => {
      if (s.mode !== "stopwatch") return s;
      return {
        seconds: 0,
        running: false,
        stopwatchBaseSeconds: 0,
        stopwatchStartedAtMs: null,
        hasStarted: false,
      };
    }),

  stop: () => {
    const { mode, seconds, restTotalSeconds, setTimerTarget } = get();
    if (mode === "setTimer" && setTimerTarget) {
      applySetTimerStopCompletion({
        target: setTimerTarget,
        restTotalSeconds,
        secondsLeft: seconds,
      });
    }
    resetTimerCompletionTracking();
    void cancelTimerBackgroundNotification();
    set({
      mode: "idle",
      presentation: "fullscreen",
      running: false,
      seconds: 0,
      restTotalSeconds: 0,
      lastStopwatchSeconds:
        mode === "stopwatch" && seconds > 0 ? seconds : null,
      hasStarted: false,
      setTimerTarget: null,
      ...clearClockFields(),
    });
  },

  dismissLast: () => set({ lastStopwatchSeconds: null }),

  minimizeTimer: () => {
    const { mode } = get();
    if (mode !== "rest" && mode !== "setTimer") return;
    set({ presentation: "minimized" });
  },

  expandTimer: () => set({ presentation: "fullscreen" }),

  syncTimerClock: () =>
    set((s) => {
      if (!s.running) return s;

      if (s.mode === "rest" || s.mode === "setTimer") {
        if (s.countdownEndsAtMs == null) return s;
        const remainingMs = Math.max(0, s.countdownEndsAtMs - Date.now());
        if (remainingMs <= 0) {
          completeTimerCountdown(s.countdownEndsAtMs);
          return {
            seconds: 0,
            running: false,
            countdownEndsAtMs: null,
            countdownRemainingMs: 0,
          };
        }
        const displaySec = displayCountdownSeconds(remainingMs);
        if (displaySec === s.seconds && remainingMs === s.countdownRemainingMs) {
          return s;
        }
        return { seconds: displaySec, countdownRemainingMs: remainingMs };
      }

      if (s.mode === "stopwatch") {
        if (s.stopwatchStartedAtMs == null) return s;
        const elapsed =
          s.stopwatchBaseSeconds +
          Math.floor((Date.now() - s.stopwatchStartedAtMs) / 1000);
        if (elapsed === s.seconds) return s;
        return { seconds: elapsed };
      }

      return s;
    }),
}));
