"use client";

import {
  PROGRAM_MODE_LABELS,
  type ProgramMode,
} from "@/lib/weeklyCategoryLayout";

type Props = {
  value: ProgramMode;
  onChange: (mode: ProgramMode) => void;
};

const MODES: ProgramMode[] = ["preset", "custom"];

export default function ProgramModeSelector({ value, onChange }: Props) {
  const active = PROGRAM_MODE_LABELS[value];

  return (
    <div className="space-y-2" id="your-week-settings">
      <div
        className="grid grid-cols-2 gap-1 rounded-lg bg-surface-hover p-1"
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
              className={`rounded-md px-2.5 py-2.5 text-center text-sm font-semibold transition-colors min-h-10 ${
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
      <p className="text-sm leading-snug text-muted">{active.description}</p>
    </div>
  );
}
