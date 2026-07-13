"use client";

import {
  useFloatingTimerStore,
  type SetTimerTarget,
} from "@/stores/useFloatingTimerStore";

interface SetTimerPillProps {
  seconds: number;
  title?: string;
  /** When set, stop/close can mark this exercise complete (if the setting is on). */
  target?: SetTimerTarget;
}

/** Compact control to start the floating set timer. */
export default function SetTimerPill({
  seconds,
  title,
  target,
}: SetTimerPillProps) {
  const label = title ?? `Start set timer (${seconds}s)`;
  return (
    <button
      type="button"
      onClick={() =>
        useFloatingTimerStore.getState().startSetCountdown(seconds, target)
      }
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-sm font-semibold text-white shadow-md shadow-accent/25 transition-transform active:scale-95"
      title={label}
      aria-label={label}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </svg>
      <span className="tabular-nums">{seconds}s</span>
    </button>
  );
}
