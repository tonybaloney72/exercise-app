import { haversineDistanceMeters, metersToMiles } from "@/lib/geo/haversine";
import {
  GpsTracking,
  isForegroundGpsTrackingAvailable,
  type GpsTrackingLocationUpdate,
} from "@/lib/geo/gpsTrackingPlugin";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import type { PluginListenerHandle } from "@capacitor/core";

export interface GpsTrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface GpsTrackSnapshot {
  durationSeconds: number;
  distanceMi: number;
  startDate: Date;
  endDate: Date;
  pointCount: number;
  points: readonly GpsTrackPoint[];
}

export function computeGpsTrackSnapshot(
  points: readonly GpsTrackPoint[],
  startedAtMs: number,
  endedAtMs: number = Date.now(),
): GpsTrackSnapshot {
  let distanceMeters = 0;
  for (let i = 1; i < points.length; i += 1) {
    distanceMeters += haversineDistanceMeters(points[i - 1]!, points[i]!);
  }
  const durationSeconds = Math.max(
    1,
    Math.round((endedAtMs - startedAtMs) / 1000),
  );
  return {
    durationSeconds,
    distanceMi: Math.round(metersToMiles(distanceMeters) * 100) / 100,
    startDate: new Date(startedAtMs),
    endDate: new Date(endedAtMs),
    pointCount: points.length,
    points: [...points],
  };
}

export function formatGpsTrackDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Reject fixes worse than this (meters). */
const GPS_MAX_ACCURACY_M = 25;

/** Minimum horizontal movement between stored points (meters). */
const GPS_MIN_MOVEMENT_M = 2;

/** Movement must exceed accuracy × this ratio to count as real travel. */
const GPS_ACCURACY_MOVEMENT_RATIO = 0.5;

/** Time-based fallback when fixes are sparse (ms). */
const GPS_MAX_POINT_GAP_MS = 4_000;

/** On time fallback, still require this fraction of accuracy as movement. */
const GPS_TIME_FALLBACK_ACCURACY_RATIO = 0.25;

/** Default accuracy when the platform omits it (conservative). */
const GPS_UNKNOWN_ACCURACY_M = GPS_MAX_ACCURACY_M;

export function shouldAppendGpsTrackPoint(
  last: GpsTrackPoint | undefined,
  candidate: GpsTrackPoint,
  accuracyM: number | undefined,
): boolean {
  const accuracy = accuracyM ?? GPS_UNKNOWN_ACCURACY_M;
  if (
    !Number.isFinite(accuracy) ||
    accuracy <= 0 ||
    accuracy > GPS_MAX_ACCURACY_M
  ) {
    return false;
  }

  if (!last) {
    return true;
  }

  const distanceM = haversineDistanceMeters(last, candidate);
  const minMoveM = Math.max(
    GPS_MIN_MOVEMENT_M,
    accuracy * GPS_ACCURACY_MOVEMENT_RATIO,
  );
  if (distanceM >= minMoveM) {
    return true;
  }

  const elapsedMs = candidate.timestamp - last.timestamp;
  if (elapsedMs >= GPS_MAX_POINT_GAP_MS) {
    const timeFallbackMinM = Math.max(
      1,
      accuracy * GPS_TIME_FALLBACK_ACCURACY_RATIO,
    );
    return distanceM >= timeFallbackMinM;
  }

  return false;
}

type TrackingBackend = "foreground" | "geolocation";

export class GpsTrackSession {
  private watchId: string | null = null;
  private points: GpsTrackPoint[] = [];
  private startedAtMs: number | null = null;
  private backend: TrackingBackend | null = null;
  private locationListener: PluginListenerHandle | null = null;

  getPoints(): readonly GpsTrackPoint[] {
    return this.points;
  }

  /** Start timer and GPS together (no separate warm-up modal). */
  async startImmediate(): Promise<void> {
    if (!isNativePlatform()) {
      throw new Error("GPS tracking is only available in the Android app.");
    }
    if (this.backend) return;

    this.points = [];
    this.startedAtMs = Date.now();

    if (isForegroundGpsTrackingAvailable()) {
      await this.startForegroundTracking();
      return;
    }

    await this.startGeolocationWatch();
  }

  private async startForegroundTracking(): Promise<void> {
    this.backend = "foreground";
    this.locationListener = await GpsTracking.addListener(
      "locationUpdate",
      (event: GpsTrackingLocationUpdate) => {
        if (this.startedAtMs == null) return;
        this.appendPoint({
          coords: {
            latitude: event.latitude,
            longitude: event.longitude,
            accuracy: event.accuracy,
          },
          timestamp: event.timestamp,
        });
      },
    );

    await GpsTracking.startTracking({
      title: "Tracking activity",
      body: "MyExercise is recording your route.",
    });
  }

  private async startGeolocationWatch(): Promise<void> {
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.requestPermissions();
    if (status.location !== "granted" && status.coarseLocation !== "granted") {
      throw new Error("Location permission is required to track distance.");
    }

    this.backend = "geolocation";
    this.watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 2_000,
      },
      (position, error) => {
        if (error || !position || this.startedAtMs == null) return;
        this.appendPoint(position);
      },
    );
  }

  private appendPoint(position: {
    coords: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    timestamp: number;
  }): void {
    const point: GpsTrackPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: position.timestamp,
    };
    const last = this.points[this.points.length - 1];
    if (!shouldAppendGpsTrackPoint(last, point, position.coords.accuracy)) {
      return;
    }
    this.points.push(point);
  }

  async stop(): Promise<GpsTrackSnapshot | null> {
    await this.clearWatch();
    if (this.startedAtMs == null) return null;
    const snapshot = computeGpsTrackSnapshot(this.points, this.startedAtMs);
    this.startedAtMs = null;
    return snapshot;
  }

  async dispose(): Promise<void> {
    await this.clearWatch();
    this.points = [];
    this.startedAtMs = null;
  }

  private async clearWatch(): Promise<void> {
    if (this.backend === "foreground") {
      try {
        await GpsTracking.stopTracking();
      } catch {
        // Service may already be stopped.
      }
      await this.locationListener?.remove();
      this.locationListener = null;
    } else if (this.watchId) {
      const { Geolocation } = await import("@capacitor/geolocation");
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
    this.backend = null;
  }
}
