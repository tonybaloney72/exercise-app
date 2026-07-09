/** Shared touch-friendly control styles (settings pills, small actions). */

/** Prefer `flex flex-col gap-*` and symmetric `py-*` - avoid `space-y-*` (margin-based) and lone `pt-*` for section spacing. */

const uiChoicePillBase =
  "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors min-h-9";

export function uiChoicePillClass(active: boolean): string {
  return `${uiChoicePillBase} ${
    active
      ? "border-accent bg-accent/15 text-accent"
      : "border-border bg-background text-muted hover:border-accent/30"
  }`;
}

/** Compact pills (e.g. exercise row Reps / Timer). */
const uiChoicePillCompact =
  "rounded-lg border px-2 py-0.5 text-xs font-medium transition-colors min-h-0";

function uiChoicePillCompactClass(active: boolean): string {
  return `${uiChoicePillCompact} ${
    active
      ? "border-accent bg-accent/15 text-accent"
      : "border-border bg-surface-hover text-muted hover:text-foreground"
  }`;
}

export function uiChoicePillSolidClass(active: boolean): string {
  return `${uiChoicePillBase} ${
    active
      ? "bg-accent text-white"
      : "bg-background text-muted hover:text-foreground disabled:opacity-40"
  }`;
}
