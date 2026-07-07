"use client";

import { useEffect, useRef } from "react";
import { useEffectiveDarkMode } from "@/hooks/useEffectiveDarkMode";
import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";
import { hasRenderableGpsRoute } from "@/lib/geo/gpsTrackPolyline";
import {
  gpsRouteBounds,
  openFreemapStyleForDarkMode,
} from "@/lib/geo/gpsRouteGeoJson";
import { attachMapLibreMissingSpriteFallback, syncGpsRouteMapOverlay } from "@/lib/geo/gpsRouteMapOverlay";

type Props = {
  points: readonly GpsTrackPoint[];
  className?: string;
  /** Accessible label; defaults to a generic route description. */
  ariaLabel?: string;
};

/** Show compact attribution (ⓘ only); full text stays available on tap. */
function collapseMapLibreAttribution(container: HTMLElement) {
  const attrib = container.querySelector(".maplibregl-ctrl-attrib");
  if (!(attrib instanceof HTMLElement)) return;
  attrib.classList.remove("maplibregl-compact-show");
  attrib.removeAttribute("open");
}

/** MapLibre basemap with GPS route overlay (detail views). */
export default function GpsRouteMap({
  points,
  className = "",
  ariaLabel = "GPS activity route on map",
}: Props) {
  const isDark = useEffectiveDarkMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const styleUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasRenderableGpsRoute(points) || !containerRef.current) return;

    const container = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;

    void (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !container) return;

      const bounds = gpsRouteBounds(points);
      const styleUrl = openFreemapStyleForDarkMode(isDark);
      styleUrlRef.current = styleUrl;

      const map = new maplibregl.Map({
        container,
        style: styleUrl,
        bounds,
        fitBoundsOptions: { padding: 40, maxZoom: 16 },
        attributionControl: { compact: true },
        interactive: true,
      });

      mapRef.current = map;
      attachMapLibreMissingSpriteFallback(map);
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );

      map.on("load", () => {
        if (!mapRef.current) return;
        collapseMapLibreAttribution(container);
        syncGpsRouteMapOverlay(mapRef.current, points);
        mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 0 });
      });

      resizeObserver = new ResizeObserver(() => {
        mapRef.current?.resize();
      });
      resizeObserver.observe(container);
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      styleUrlRef.current = null;
    };
    // Map instance is created once per mount; theme/point updates use the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isDark/points synced separately
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasRenderableGpsRoute(points)) return;

    const bounds = gpsRouteBounds(points);
    const targetStyle = openFreemapStyleForDarkMode(isDark);

    const applyOverlay = () => {
      if (!mapRef.current || !containerRef.current) return;
      collapseMapLibreAttribution(containerRef.current);
      syncGpsRouteMapOverlay(mapRef.current, points);
      mapRef.current.fitBounds(bounds, {
        padding: 40,
        maxZoom: 16,
        duration: 0,
      });
    };

    if (styleUrlRef.current !== targetStyle) {
      styleUrlRef.current = targetStyle;
      map.once("style.load", applyOverlay);
      map.setStyle(targetStyle);
      return;
    }

    if (map.isStyleLoaded()) {
      applyOverlay();
      return;
    }

    map.once("load", applyOverlay);
  }, [points, isDark]);

  if (!hasRenderableGpsRoute(points)) return null;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-border bg-background/70 ${className}`}
    >
      <div
        ref={containerRef}
        role="img"
        aria-label={ariaLabel}
        className="h-56 w-full min-h-44"
      />
    </div>
  );
}
