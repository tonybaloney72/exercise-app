"use client";

import { motion } from "framer-motion";

const RADIUS = 45;

/** Circumference for `r={RADIUS}` in a 0–100 viewBox (matches rest timer math). */
export const COUNTDOWN_RING_CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type CountdownRingProps = {
  /** 1 = full ring (start), 0 = empty (end). */
  progress: number;
  className?: string;
  trackClassName?: string;
  progressClassName?: string;
  strokeWidth?: number;
};

/**
 * Circular progress ring for countdown UIs (rest timer, inline set timer).
 * `progress` is remaining fraction so the ring shrinks as time runs out.
 */
export default function CountdownRing({
  progress,
  className = "",
  trackClassName = "stroke-[var(--border-color)]/45",
  progressClassName = "text-accent",
  strokeWidth = 4,
}: CountdownRingProps) {
  const p = Math.min(1, Math.max(0, progress));

  return (
    <svg
      viewBox="0 0 100 100"
      className={`shrink-0 -rotate-90 ${className}`}
      aria-hidden
    >
      <circle
        cx="50"
        cy="50"
        r={RADIUS}
        fill="none"
        strokeWidth={strokeWidth}
        className={trackClassName}
      />
      <motion.circle
        cx="50"
        cy="50"
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={COUNTDOWN_RING_CIRCUMFERENCE}
        className={progressClassName}
        initial={false}
        animate={{
          strokeDashoffset: COUNTDOWN_RING_CIRCUMFERENCE * (1 - p),
        }}
        transition={{ duration: 0.95, ease: "linear" }}
      />
    </svg>
  );
}
