"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  hint?: string;
  children: ReactNode;
};

/** Nested settings for the active week build mode (visually distinct from mode picker). */
export default function WeekModeOptionsPanel({ title, hint, children }: Props) {
  return (
    <div
      className="rounded-xl border border-dashed border-accent/25 bg-background/40 p-4 space-y-3"
      aria-labelledby="week-mode-options-heading"
    >
      <div>
        <p
          id="week-mode-options-heading"
          className="text-[10px] font-semibold uppercase tracking-wide text-accent"
        >
          {title}
        </p>
        {hint ? (
          <p className="text-[11px] leading-snug text-muted mt-1">{hint}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
