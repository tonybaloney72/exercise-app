"use client";

import { create } from "zustand";
import { primeTimerAudio, playTimerDoneAlert } from "@/utils/timerAlert";

export type TimerMode = "idle" | "rest" | "stopwatch" | "setTimer";
export type TimerPresentation = "fullscreen" | "minimized";

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
  /** Wall-clock ms when the current stopwatch segment started (null while paused). */
  stopwatchStartedAtMs: number | null;
  /** Elapsed seconds accumulated before the current stopwatch segment. */
  stopwatchBaseSeconds: number;

  startRest: (totalSeconds: number, autoStart?: boolean) => void;
  startSetCountdown: (totalSeconds: number) => void;
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
  stopwatchStartedAtMs: null,
  stopwatchBaseSeconds: 0,

  startRest: (totalSeconds, autoStart = true) => {
    primeTimerAudio();
    const seconds = Math.max(0, Math.floor(totalSeconds));
    set({
      mode: "rest",
      presentation: "fullscreen",
      running: autoStart,
      seconds,
      restTotalSeconds: seconds,
      lastStopwatchSeconds: null,
      countdownEndsAtMs: autoStart ? countdownEndsAtFromSeconds(seconds) : null,
      stopwatchStartedAtMs: null,
      stopwatchBaseSeconds: 0,
    });
  },

  startSetCountdown: (totalSeconds) => {
    primeTimerAudio();
    const seconds = Math.max(0, Math.floor(totalSeconds));
    set({
      mode: "setTimer",
      presentation: "fullscreen",
      running: true,
      seconds,
      restTotalSeconds: seconds,
      lastStopwatchSeconds: null,
      countdownEndsAtMs: countdownEndsAtFromSeconds(seconds),
      stopwatchStartedAtMs: null,
      stopwatchBaseSeconds: 0,
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
      };
    }),

  pause: () =>
    set((s) => {
      if (!s.running) return s;
      if (s.mode === "rest" || s.mode === "setTimer") {
        if (s.countdownEndsAtMs != null) {
          const left = Math.max(
            0,
            Math.ceil((s.countdownEndsAtMs - Date.now()) / 1000),
          );
          return { running: false, seconds: left, countdownEndsAtMs: null };
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
        return {
          running: true,
          countdownEndsAtMs: countdownEndsAtFromSeconds(s.seconds),
        };
      }
      if (s.mode === "stopwatch") {
        return {
          running: true,
          stopwatchStartedAtMs: Date.now(),
        };
      }
      return { running: true };
    }),

  adjustRest: (deltaSeconds) =>
    set((s) => {
      if (s.mode !== "rest") return s;
      const next = Math.max(0, s.seconds + deltaSeconds);
      const total = Math.max(s.restTotalSeconds, next);
      return {
        seconds: next,
        restTotalSeconds: total,
        countdownEndsAtMs:
          s.running && s.countdownEndsAtMs != null
            ? s.countdownEndsAtMs + deltaSeconds * 1000
            : s.running
              ? countdownEndsAtFromSeconds(next)
              : null,
      };
    }),

  resetRest: () =>
    set((s) => {
      if (s.mode !== "rest" && s.mode !== "setTimer") return s;
      return {
        seconds: s.restTotalSeconds,
        running: true,
        countdownEndsAtMs: countdownEndsAtFromSeconds(s.restTotalSeconds),
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
      };
    }),

  stop: () => {
    const { mode, seconds } = get();
    set({
      mode: "idle",
      presentation: "fullscreen",
      running: false,
      seconds: 0,
      restTotalSeconds: 0,
      lastStopwatchSeconds:
        mode === "stopwatch" && seconds > 0 ? seconds : null,
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
        const left = Math.max(
          0,
          Math.ceil((s.countdownEndsAtMs - Date.now()) / 1000),
        );
        if (left <= 0) {
          playTimerDoneAlert();
          return {
            seconds: 0,
            running: false,
            countdownEndsAtMs: null,
          };
        }
        if (left === s.seconds) return s;
        return { seconds: left };
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
