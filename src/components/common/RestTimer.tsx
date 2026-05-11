"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTimer } from "@/hooks/useTimer";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function RestTimer() {
  const { isTimerRunning, timerSeconds, formattedTime, startTimer, stopTimer } =
    useTimer();
  const restBetweenRounds = useSettingsStore((s) => s.restBetweenRounds);

  if (!isTimerRunning && timerSeconds === 0) {
    return (
      <button
        onClick={() => startTimer(restBetweenRounds)}
        className="flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/30 active:bg-accent/40"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Rest Timer ({restBetweenRounds}s)
      </button>
    );
  }

  const progress = timerSeconds / restBetweenRounds;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="flex items-center gap-3 rounded-full bg-accent/20 px-4 py-2"
      >
        <div className="relative h-8 w-8">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
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
        <span className="text-lg font-bold tabular-nums text-accent">
          {formattedTime}
        </span>
        <button
          onClick={stopTimer}
          className="ml-1 rounded-full p-1 text-muted hover:text-foreground"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
