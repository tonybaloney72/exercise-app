"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

export function useTimer() {
  const { isTimerRunning, timerSeconds, startTimer, tickTimer, stopTimer } =
    useWorkoutStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      intervalRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTimerRunning, timerSeconds, tickTimer]);

  useEffect(() => {
    if (isTimerRunning && timerSeconds === 0) {
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
  }, [isTimerRunning, timerSeconds]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  return {
    isTimerRunning,
    timerSeconds,
    formattedTime: formatTime(timerSeconds),
    startTimer,
    stopTimer,
  };
}
