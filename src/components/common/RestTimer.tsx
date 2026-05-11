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
    <div className="fixed top-4 right-4 z-40">
      <AnimatePresence mode="wait" initial={false}>
        {isIdle ? (
          <motion.button
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={startTimer}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-lg shadow-accent/30 text-white active:scale-95 transition-transform"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </motion.button>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2.5 rounded-full bg-surface border border-border shadow-lg pl-3 pr-2 py-2"
          >
            <div className="relative h-8 w-8 shrink-0">
              <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
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
            <span className="text-sm font-bold tabular-nums text-foreground">
              {formatTime(secondsLeft)}
            </span>
            <button
              onClick={stopTimer}
              className="rounded-full p-1.5 text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
