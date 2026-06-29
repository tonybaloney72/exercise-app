import type { CSSProperties } from "react";

export type ProgressLineDotProps = {
  r: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

/** Shared tooltip panel styling for default Recharts `<Tooltip contentStyle={…} />`. */
export const PROGRESS_TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border-color)",
  borderRadius: 10,
  color: "var(--foreground)",
  fontSize: 12,
};

/** Shared class for custom tooltip renderers (cardio, steps, health). */
export const PROGRESS_TOOLTIP_PANEL_CLASS =
  "rounded-lg border border-border px-3 py-2 text-xs shadow-lg";

export const PROGRESS_AXIS_TICK = { fill: "var(--muted)", fontSize: 11 };

export const PROGRESS_CARTESIAN_GRID = {
  stroke: "var(--border-color)",
  strokeDasharray: "4 4",
  vertical: false,
} as const;

/** Line / composed line series: vertical crosshair on tap/hover. */
export const PROGRESS_LINE_CURSOR = {
  stroke: "var(--muted)",
  strokeWidth: 1,
};

/** Bar series: subtle column highlight behind the tooltip. */
export const PROGRESS_BAR_CURSOR = {
  fill: "var(--surface-hover)",
};

export const PROGRESS_CHART_MARGIN = {
  compact: { top: 8, right: 8, left: 4, bottom: 4 },
  legend: { top: 28, right: 8, left: 0, bottom: 4 },
} as const;

export function progressYAxisLabel(value: string, offset = 0) {
  return {
    value,
    angle: -90,
    position: "insideLeft" as const,
    fill: "var(--muted)",
    fontSize: 10,
    offset,
  };
}

export function progressLineDot(fill = "var(--accent)"): ProgressLineDotProps {
  return {
    r: 3,
    fill,
    stroke: "var(--background)",
    strokeWidth: 1,
  };
}

/** Single clear highlight on the selected point (no default Recharts double ring). */
export function progressLineActiveDot(fill = "var(--accent)"): ProgressLineDotProps {
  return {
    r: 6,
    fill,
    stroke: "var(--foreground)",
    strokeWidth: 2,
  };
}

export const PROGRESS_LINE_STROKE = {
  stroke: "var(--accent)",
  strokeWidth: 2,
} as const;
