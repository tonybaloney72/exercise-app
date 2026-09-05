"use client";

import CompletionCheckmark from "@/components/common/CompletionCheckmark";

/**
 * Column width for row spacers that align with the checkbox.
 * Matches the ~40px tap target (`h-10` / `w-10`).
 */
export const WORKOUT_COMPLETION_CHECKBOX_WIDTH_CLASS = "w-10";

type Props = {
  completed: boolean;
  onClick: () => void;
  "aria-label"?: string;
  className?: string;
};

/**
 * Completion toggle: ~36px bordered visual inside a ~40px tap target
 * (Phase 0 touch targets — avoid tiny 20px controls without growing the row too much).
 */
export default function WorkoutCompletionCheckbox({
  completed,
  onClick,
  "aria-label": ariaLabel,
  className = "",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={completed}
      aria-label={
        ariaLabel ?? (completed ? "Mark incomplete" : "Mark complete")
      }
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-transform active:scale-95 ${className}`}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-md border-2"
        style={{
          borderColor: completed
            ? "var(--accent)"
            : "var(--checkbox-unchecked-border)",
          backgroundColor: completed
            ? "var(--accent)"
            : "var(--checkbox-unchecked-bg)",
        }}
        aria-hidden
      >
        {completed ? <CompletionCheckmark /> : null}
      </span>
    </button>
  );
}
