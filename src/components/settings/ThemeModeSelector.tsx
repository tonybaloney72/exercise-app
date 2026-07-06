"use client";

import {
  THEME_MODE_LABELS,
  THEME_MODES,
  type ThemeMode,
} from "@/lib/themeMode";

type Props = {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
};

export default function ThemeModeSelector({ value, onChange }: Props) {
  const active = THEME_MODE_LABELS[value];

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid grid-cols-3 gap-1 rounded-lg bg-surface-hover p-1"
        role="radiogroup"
        aria-label="Theme"
      >
        {THEME_MODES.map((mode) => {
          const selected = value === mode;
          const { label } = THEME_MODE_LABELS[mode];
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
