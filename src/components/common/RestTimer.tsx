"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function RestTimer() {
  const restBetweenRounds = useSettingsStore((s) => s.restBetweenRounds);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return clearTick;
  }, [running, secondsLeft > 0, clearTick]);

  useEffect(() => {
    if (!running && secondsLeft === 0 && intervalRef.current === null) return;
    if (running || secondsLeft !== 0) return;
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, [running, secondsLeft]);

  const startTimer = () => {
    setSecondsLeft(restBetweenRounds);
    setRunning(true);
  };

  const stopTimer = () => {
    clearTick();
    setSecondsLeft(0);
    setRunning(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isIdle = !running && secondsLeft === 0;
  const progress = restBetweenRounds > 0 ? secondsLeft / restBetweenRounds : 0;

  return (
    <div className="flex items-center justify-center min-h-[44px]">
      <AnimatePresence mode="wait" initial={false}>
        {isIdle ? (
          <motion.button
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={startTimer}
            className="flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/30 active:bg-accent/40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Rest Timer ({restBetweenRounds}s)
          </motion.button>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-3 rounded-full bg-accent/20 px-4 py-2"
          >
            <div className="relative h-5 w-5">
              <svg className="h-5 w-5 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 94.25} 94.25`}
                  className="text-accent transition-all duration-1000"
                />
              </svg>
            </div>
            <span className="text-sm font-bold tabular-nums text-accent">
              {formatTime(secondsLeft)}
            </span>
            <button
              onClick={stopTimer}
              className="ml-1 rounded-full p-1 text-muted hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
