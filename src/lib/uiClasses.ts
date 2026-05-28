/** Shared touch-friendly control styles (settings pills, small actions). */

export const uiChoicePillBase =
  "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors min-h-9";

export function uiChoicePillClass(active: boolean): string {
  return `${uiChoicePillBase} ${
    active
      ? "border-accent bg-accent/15 text-accent"
      : "border-border bg-background text-muted hover:border-accent/30"
  }`;
}

/** Compact pills (e.g. exercise row Reps / Timer). */
export const uiChoicePillCompact =
  "rounded-lg border px-2 py-0.5 text-xs font-medium transition-colors min-h-0";

export function uiChoicePillCompactClass(active: boolean): string {
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

export const uiNumberInput =
  "w-14 min-h-9 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-center text-foreground";

export const uiCheckbox = "size-5 shrink-0 rounded border-border accent-[var(--accent)]";

export const uiLabelRow = "flex items-center justify-between gap-2 text-sm";

export const uiCheckLabel =
  "flex items-center gap-2.5 text-sm text-foreground cursor-pointer min-h-9";
