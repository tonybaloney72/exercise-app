"use client";

import CompletionCheckmark from "@/components/common/CompletionCheckmark";

/** Width class for row spacers that align with the checkbox column. */
export const WORKOUT_COMPLETION_CHECKBOX_WIDTH_CLASS = "w-5 md:w-7";

type Props = {
  completed: boolean;
  onClick: () => void;
  "aria-label"?: string;
  className?: string;
};

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
      className={`flex h-5 w-5 md:h-7 md:w-7 shrink-0 items-center justify-center rounded-md border-2 transition-all active:scale-95 ${className}`}
      style={{
        borderColor: completed
          ? "var(--accent)"
          : "var(--checkbox-unchecked-border)",
        backgroundColor: completed
          ? "var(--accent)"
          : "var(--checkbox-unchecked-bg)",
      }}
    >
      {completed ? <CompletionCheckmark /> : null}
    </button>
  );
}
