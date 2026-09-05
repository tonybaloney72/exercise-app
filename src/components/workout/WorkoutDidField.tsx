"use client";

import type { ReactNode } from "react";
import type { ExerciseSetMode } from "@/types";

type Props = {
  id: string;
  mode: ExerciseSetMode;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder: string;
  /** Optional control after the amount (e.g. weight field). */
  trailing?: ReactNode;
};

/** Inline "Did" amount field on an in-session workout row. */
export default function WorkoutDidField({
  id,
  mode,
  value,
  onChange,
  placeholder,
  trailing,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label htmlFor={id} className="text-xs text-muted">
        Did
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={value != null ? String(value) : ""}
        onChange={(e) => {
          const val = e.target.value.trim();
          if (val === "") {
            onChange(undefined);
            return;
          }
          if (!/^\d+$/.test(val)) return;
          const num = parseInt(val, 10);
          if (Number.isNaN(num)) return;
          onChange(num);
        }}
        className={`w-14 rounded-md border border-border bg-background px-2 py-0.5 text-right text-sm text-foreground outline-none focus:border-accent ${
          mode === "timer" ? "font-mono" : ""
        }`}
        placeholder={placeholder}
        aria-label={
          mode === "reps" ? "Completed reps" : "Completed duration in seconds"
        }
      />
      {trailing}
    </div>
  );
}
