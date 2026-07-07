import type { GeoJSONSource, Map as MaplibreMap } from "maplibre-gl";
import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";
import { gpsRouteLineGeoJson } from "@/lib/geo/gpsRouteGeoJson";

const GPS_ROUTE_SOURCE_ID = "gps-route";
const GPS_ROUTE_LAYER_ID = "gps-route-line";
const GPS_ROUTE_ENDPOINTS_SOURCE_ID = "gps-route-endpoints";
const GPS_ROUTE_START_LAYER_ID = "gps-route-start";
const GPS_ROUTE_END_LAYER_ID = "gps-route-end";

const ROUTE_START = "#4ade80";
const ROUTE_END = "#f87171";

const TRANSPARENT_SPRITE = {
  width: 1,
  height: 1,
  data: new Uint8Array(4),
};

/** Prevents console spam when Liberty POI icons are absent from OpenFreeMap sprites. */
export function attachMapLibreMissingSpriteFallback(map: MaplibreMap): void {
  map.on("styleimagemissing", (event) => {
    if (!map.hasImage(event.id)) {
      map.addImage(event.id, TRANSPARENT_SPRITE);
    }
  });
}

function readCssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function endpointGeoJson(points: readonly GpsTrackPoint[]): GeoJSON.FeatureCollection {
  const start = points[0]!;
  const end = points[points.length - 1]!;

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "start" },
        geometry: {
          type: "Point",
          coordinates: [start.lng, start.lat],
        },
      },
      {
        type: "Feature",
        properties: { kind: "end" },
        geometry: {
          type: "Point",
          coordinates: [end.lng, end.lat],
        },
      },
    ],
  };
}

/** Add or update the GPS route line and start/end markers on a MapLibre map. */
export function syncGpsRouteMapOverlay(
  map: MaplibreMap,
  points: readonly GpsTrackPoint[],
): void {
  const routeGeoJson = gpsRouteLineGeoJson(points);
  const endpoints = endpointGeoJson(points);
  const accent = readCssVar("--accent", "#6366f1");
  const markerStroke = readCssVar("--background", "#0f1117");

  const routeSource = map.getSource(GPS_ROUTE_SOURCE_ID) as
    | GeoJSONSource
    | undefined;
  if (routeSource) {
    routeSource.setData(routeGeoJson);
  } else {
    map.addSource(GPS_ROUTE_SOURCE_ID, {
      type: "geojson",
      data: routeGeoJson,
    });
    map.addLayer({
      id: GPS_ROUTE_LAYER_ID,
      type: "line",
      source: GPS_ROUTE_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": accent,
        "line-width": 4,
        "line-opacity": 0.95,
      },
    });
  }

  if (map.getLayer(GPS_ROUTE_LAYER_ID)) {
    map.setPaintProperty(GPS_ROUTE_LAYER_ID, "line-color", accent);
  }

  const endpointSource = map.getSource(GPS_ROUTE_ENDPOINTS_SOURCE_ID) as
    | GeoJSONSource
    | undefined;
  if (endpointSource) {
    endpointSource.setData(endpoints);
  } else {
    map.addSource(GPS_ROUTE_ENDPOINTS_SOURCE_ID, {
      type: "geojson",
      data: endpoints,
    });

    map.addLayer({
      id: GPS_ROUTE_START_LAYER_ID,
      type: "circle",
      source: GPS_ROUTE_ENDPOINTS_SOURCE_ID,
      filter: ["==", ["get", "kind"], "start"],
      paint: {
        "circle-radius": 6,
        "circle-color": ROUTE_START,
        "circle-stroke-color": markerStroke,
        "circle-stroke-width": 2,
      },
    });

    map.addLayer({
      id: GPS_ROUTE_END_LAYER_ID,
      type: "circle",
      source: GPS_ROUTE_ENDPOINTS_SOURCE_ID,
      filter: ["==", ["get", "kind"], "end"],
      paint: {
        "circle-radius": 6,
        "circle-color": ROUTE_END,
        "circle-stroke-color": markerStroke,
        "circle-stroke-width": 2,
      },
    });
  }

  if (map.getLayer(GPS_ROUTE_START_LAYER_ID)) {
    map.setPaintProperty(
      GPS_ROUTE_START_LAYER_ID,
      "circle-stroke-color",
      markerStroke,
    );
  }
  if (map.getLayer(GPS_ROUTE_END_LAYER_ID)) {
    map.setPaintProperty(
      GPS_ROUTE_END_LAYER_ID,
      "circle-stroke-color",
      markerStroke,
    );
  }
}
