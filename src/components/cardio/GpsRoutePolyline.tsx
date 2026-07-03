"use client";

import { useMemo } from "react";
import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";
import {
  buildGpsPolylineSvgModel,
  hasRenderableGpsRoute,
} from "@/lib/geo/gpsTrackPolyline";

type Props = {
  points: readonly GpsTrackPoint[];
  className?: string;
  /** Accessible label; defaults to a generic route description. */
  ariaLabel?: string;
};

/** Minimal HC-style route preview — polyline on a plain background, no basemap. */
export default function GpsRoutePolyline({
  points,
  className = "",
  ariaLabel = "GPS activity route",
}: Props) {
  const model = useMemo(() => buildGpsPolylineSvgModel(points), [points]);

  if (!hasRenderableGpsRoute(points) || !model) return null;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-border bg-background/70 ${className}`}
    >
      <svg
        viewBox={model.viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
        className="block h-auto w-full min-h-28 max-h-50 text-accent"
      >
        <path
          d={model.pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={model.start.x}
          cy={model.start.y}
          r={4}
          className="fill-green-400"
          stroke="var(--background)"
          strokeWidth={1.5}
        />
        <circle
          cx={model.end.x}
          cy={model.end.y}
          r={4}
          className="fill-red-400"
          stroke="var(--background)"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
