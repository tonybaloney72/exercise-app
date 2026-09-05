"use client";

import type { ReactNode } from "react";

type SettingsSegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type Props<T extends string> = {
  value: T;
  options: readonly SettingsSegmentedOption<T>[];
  onChange: (value: T) => void;
  "aria-label": string;
  /** Columns for the radiogroup grid (defaults to options.length). */
  columns?: number;
  /** Description shown under the control. */
  description?: ReactNode;
  className?: string;
};

/** Shared settings segmented radio control (theme / program mode / etc.). */
export default function SettingsSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  columns,
  description,
  className = "",
}: Props<T>) {
  const cols = columns ?? options.length;

  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      <div
        className="grid gap-1 rounded-lg bg-surface-hover p-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={ariaLabel}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-md px-2.5 py-2.5 text-center text-sm font-semibold transition-colors min-h-10 ${
                selected
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {description ? (
        <p className="text-sm leading-snug text-muted">{description}</p>
      ) : null}
    </div>
  );
}
