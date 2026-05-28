"use client";

import {
  PROGRAM_MODE_LABELS,
  type ProgramMode,
} from "@/lib/weeklyCategoryLayout";

type Props = {
  value: ProgramMode;
  onChange: (mode: ProgramMode) => void;
};

const MODES: ProgramMode[] = ["preset", "layout", "custom"];

export default function ProgramModeSelector({ value, onChange }: Props) {
  const active = PROGRAM_MODE_LABELS[value];

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        Step 1 · Choose how to build
      </p>
      <div
        className="grid grid-cols-3 gap-1 rounded-lg bg-surface-hover p-1"
        role="radiogroup"
        aria-label="How to build your week"
      >
        {MODES.map((mode) => {
          const selected = value === mode;
          const { label } = PROGRAM_MODE_LABELS[mode];
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(mode)}
              className={`rounded-md px-2 py-2 text-center text-xs font-semibold transition-colors ${
                selected
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-snug text-muted">{active.description}</p>
    </div>
  );
}
