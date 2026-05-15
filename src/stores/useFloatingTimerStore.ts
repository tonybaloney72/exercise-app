"use client";

import { create } from "zustand";
import { primeTimerAudio, playTimerDoneAlert } from "@/utils/timerAlert";

export type TimerMode = "idle" | "rest" | "stopwatch" | "setTimer";

interface FloatingTimerState {
  mode: TimerMode;
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

  /**
   * @param autoStart If true (default), the countdown starts running
   *   immediately. Pass false to open the modal paused — used when the user
   *   launches the timer manually so they can press play themselves.
   */
  startRest: (totalSeconds: number, autoStart?: boolean) => void;
  /** Fullscreen countdown for a timed exercise set (same UX as rest timer). */
  startSetCountdown: (totalSeconds: number) => void;
  /**
   * @param autoStart If true (default), the stopwatch starts running
   *   immediately. Pass false to open the modal paused so the user can
   *   press play themselves.
   */
  startStopwatch: (autoStart?: boolean) => void;
  pause: () => void;
  resume: () => void;
  /** ±15s adjustment for an active or paused rest countdown. */
  adjustRest: (deltaSeconds: number) => void;
  /** Resets countdown to its original total without leaving rest mode. */
  resetRest: () => void;
  /** Stopwatch only: clear elapsed time to 0:00 and pause; modal stays open. */
  resetStopwatch: () => void;
  /**
   * Closes the modal (Escape / X). Rest: discard. Stopwatch: saves elapsed
   * seconds to `lastStopwatchSeconds` for the floating pill.
   */
  stop: () => void;
  /** Clears the persisted "last stopwatch" pill label. */
  dismissLast: () => void;
  /** Internal tick — invoked by the modal's interval. */
  tick: () => void;
}

export const useFloatingTimerStore = create<FloatingTimerState>((set, get) => ({
  mode: "idle",
  running: false,
  seconds: 0,
  restTotalSeconds: 0,
  lastStopwatchSeconds: null,

  startRest: (totalSeconds, autoStart = true) => {
    primeTimerAudio();
    set({
      mode: "rest",
      running: autoStart,
      seconds: Math.max(0, Math.floor(totalSeconds)),
      restTotalSeconds: Math.max(0, Math.floor(totalSeconds)),
      lastStopwatchSeconds: null,
    });
  },

  startSetCountdown: (totalSeconds) => {
    primeTimerAudio();
    set({
      mode: "setTimer",
      running: true,
      seconds: Math.max(0, Math.floor(totalSeconds)),
      restTotalSeconds: Math.max(0, Math.floor(totalSeconds)),
      lastStopwatchSeconds: null,
    });
  },

  startStopwatch: (autoStart = true) =>
    set((s) => ({
      mode: "stopwatch",
      running: autoStart,
      seconds: s.lastStopwatchSeconds ?? 0,
      restTotalSeconds: 0,
      lastStopwatchSeconds: null,
    })),

  pause: () => set({ running: false }),
  resume: () => set({ running: true }),

  adjustRest: (deltaSeconds) =>
    set((s) => {
      if (s.mode !== "rest") return s;
      const next = Math.max(0, s.seconds + deltaSeconds);
      const total = Math.max(s.restTotalSeconds, next);
      return { seconds: next, restTotalSeconds: total };
    }),

  resetRest: () =>
    set((s) => {
      if (s.mode !== "rest" && s.mode !== "setTimer") return s;
      return { seconds: s.restTotalSeconds, running: true };
    }),

  resetStopwatch: () =>
    set((s) => {
      if (s.mode !== "stopwatch") return s;
      return { seconds: 0, running: false };
    }),

  stop: () => {
    const { mode, seconds } = get();
    set({
      mode: "idle",
      running: false,
      seconds: 0,
      restTotalSeconds: 0,
      lastStopwatchSeconds:
        mode === "stopwatch" && seconds > 0 ? seconds : null,
    });
  },

  dismissLast: () => set({ lastStopwatchSeconds: null }),

  tick: () =>
    set((s) => {
      if (!s.running) return s;
      if (s.mode === "rest" || s.mode === "setTimer") {
        if (s.seconds <= 1) {
          playTimerDoneAlert();
          return { seconds: 0, running: false };
        }
        return { seconds: s.seconds - 1 };
      }
      if (s.mode === "stopwatch") {
        return { seconds: s.seconds + 1 };
      }
      return s;
    }),
}));
