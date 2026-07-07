import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";

/** App-themed basemaps (forked from OpenFreeMap Fiord / Liberty). */
export const APP_MAP_STYLE_LIGHT = "/map-styles/exercise-app-light.json";
export const APP_MAP_STYLE_DARK = "/map-styles/exercise-app-dark.json";

export function openFreemapStyleForDarkMode(isDark: boolean): string {
  return isDark ? APP_MAP_STYLE_DARK : APP_MAP_STYLE_LIGHT;
}

export type GpsRouteBounds = [[number, number], [number, number]];

/** Southwest / northeast corners in [lng, lat] for MapLibre `fitBounds`. */
export function gpsRouteBounds(
  points: readonly GpsTrackPoint[],
): GpsRouteBounds {
  let minLng = points[0]!.lng;
  let maxLng = points[0]!.lng;
  let minLat = points[0]!.lat;
  let maxLat = points[0]!.lat;

  for (let i = 1; i < points.length; i++) {
    const point = points[i]!;
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function gpsRouteLineGeoJson(
  points: readonly GpsTrackPoint[],
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: points.map((point) => [point.lng, point.lat]),
    },
  };
}
