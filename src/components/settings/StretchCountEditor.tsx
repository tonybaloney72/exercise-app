"use client";

import {
  MAX_STRETCH_COUNT_PER_DAY,
  MIN_STRETCH_COUNT_PER_DAY,
} from "@/lib/stretchCounts";

type StretchCountEditorProps = {
  warmUpStretchCount: number;
  coolDownStretchCount: number;
  onChange: (patch: {
    warmUpStretchCount?: number;
    coolDownStretchCount?: number;
  }) => void;
};

function CountRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const decDisabled = value <= MIN_STRETCH_COUNT_PER_DAY;
  const incDisabled = value >= MAX_STRETCH_COUNT_PER_DAY;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-hover px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs leading-snug text-muted">{hint}</p>
      </div>
      <div
        className="flex shrink-0 items-center gap-2"
        role="group"
        aria-label={label}
      >
        <button
          type="button"
          disabled={decDisabled}
          onClick={() => onChange(value - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-lg font-medium text-foreground transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span
          className="w-8 text-center text-sm font-semibold tabular-nums text-foreground"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          disabled={incDisabled}
          onClick={() => onChange(value + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-lg font-medium text-foreground transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function StretchCountEditor({
  warmUpStretchCount,
  coolDownStretchCount,
  onChange,
}: StretchCountEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted leading-snug">
        Each training day gets this many warm-up and cool-down stretches, picked
        from pools that match that day&apos;s focus. Edit individual stretches in
        the week builder or day editor.
      </p>
      <CountRow
        label="Warm-up"
        hint="Before working rounds"
        value={warmUpStretchCount}
        onChange={(warmUpStretchCount) => onChange({ warmUpStretchCount })}
      />
      <CountRow
        label="Cool-down"
        hint="After working rounds"
        value={coolDownStretchCount}
        onChange={(coolDownStretchCount) => onChange({ coolDownStretchCount })}
      />
    </div>
  );
}
