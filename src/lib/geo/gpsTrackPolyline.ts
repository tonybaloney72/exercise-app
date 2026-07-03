import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";

export interface GpsPolylineSvgModel {
  viewBox: string;
  pathD: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface GpsPolylineProjectionOptions {
  width?: number;
  height?: number;
  padding?: number;
}

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 180;
const DEFAULT_PADDING = 16;

/** True when there are enough GPS points to draw a route line. */
export function hasRenderableGpsRoute(
  points: readonly GpsTrackPoint[] | undefined | null,
): boolean {
  return points != null && points.length >= 2;
}

function projectLng(lat: number, lng: number): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180;
  return {
    x: lng * Math.cos(latRad),
    y: lat,
  };
}

/**
 * Project lat/lng track points into a normalized SVG path (no basemap).
 * Longitude is scaled by cos(mid-latitude) so local routes keep a natural aspect ratio.
 */
export function buildGpsPolylineSvgModel(
  points: readonly GpsTrackPoint[],
  options: GpsPolylineProjectionOptions = {},
): GpsPolylineSvgModel | null {
  if (!hasRenderableGpsRoute(points)) return null;

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const padding = options.padding ?? DEFAULT_PADDING;

  const projected = points.map((point) => ({
    ...projectLng(point.lat, point.lng),
    raw: point,
  }));

  let minX = projected[0]!.x;
  let maxX = projected[0]!.x;
  let minY = projected[0]!.y;
  let maxY = projected[0]!.y;

  for (const point of projected) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const innerW = Math.max(width - padding * 2, 1);
  const innerH = Math.max(height - padding * 2, 1);
  const scale = Math.min(innerW / spanX, innerH / spanY);

  const contentW = spanX * scale;
  const contentH = spanY * scale;
  const offsetX = padding + (innerW - contentW) / 2;
  const offsetY = padding + (innerH - contentH) / 2;

  const svgPoints = projected.map((point) => ({
    x: offsetX + (point.x - minX) * scale,
    y: offsetY + (maxY - point.y) * scale,
  }));

  const pathD = svgPoints
    .map((point, index) =>
      index === 0
        ? `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        : `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");

  return {
    viewBox: `0 0 ${width} ${height}`,
    pathD,
    start: svgPoints[0]!,
    end: svgPoints[svgPoints.length - 1]!,
  };
}
