import { describe, expect, it } from "vitest";
import {
  gpsRouteBounds,
  gpsRouteLineGeoJson,
  openFreemapStyleForDarkMode,
  APP_MAP_STYLE_DARK,
  APP_MAP_STYLE_LIGHT,
} from "@/lib/geo/gpsRouteGeoJson";
import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";

const sample: GpsTrackPoint[] = [
  { lat: 37.77, lng: -122.42, timestamp: 1 },
  { lat: 37.78, lng: -122.41, timestamp: 2 },
  { lat: 37.79, lng: -122.4, timestamp: 3 },
];

describe("gpsRouteGeoJson", () => {
  it("builds southwest/northeast bounds from track points", () => {
    expect(gpsRouteBounds(sample)).toEqual([
      [-122.42, 37.77],
      [-122.4, 37.79],
    ]);
  });

  it("builds a LineString GeoJSON feature in lng/lat order", () => {
    const feature = gpsRouteLineGeoJson(sample);
    expect(feature.type).toBe("Feature");
    expect(feature.geometry.type).toBe("LineString");
    expect(feature.geometry.coordinates).toEqual([
      [-122.42, 37.77],
      [-122.41, 37.78],
      [-122.4, 37.79],
    ]);
  });

  it("picks app-themed light and dark map style URLs", () => {
    expect(openFreemapStyleForDarkMode(false)).toBe(APP_MAP_STYLE_LIGHT);
    expect(openFreemapStyleForDarkMode(true)).toBe(APP_MAP_STYLE_DARK);
  });
});
