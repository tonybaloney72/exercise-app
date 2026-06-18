import { haversineDistanceMeters, metersToMiles } from "@/lib/geo/haversine";
import { isNativePlatform } from "@/lib/capacitorRuntime";

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
}

export type GpsTrackPhase = "idle" | "watching" | "recording";

export function computeGpsTrackSnapshot(
  points: readonly GpsTrackPoint[],
  startedAtMs: number,
  endedAtMs: number = Date.now(),
): GpsTrackSnapshot {
  let distanceMeters = 0;
  for (let i = 1; i < points.length; i += 1) {
    distanceMeters += haversineDistanceMeters(points[i - 1]!, points[i]!);
  }
  const durationSeconds = Math.max(1, Math.round((endedAtMs - startedAtMs) / 1000));
  return {
    durationSeconds,
    distanceMi: Math.round(metersToMiles(distanceMeters) * 100) / 100,
    startDate: new Date(startedAtMs),
    endDate: new Date(endedAtMs),
    pointCount: points.length,
  };
}

export function formatGpsTrackDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type WatchCallback = (
  position: { coords: { latitude: number; longitude: number }; timestamp: number } | null,
  error?: unknown,
) => void;

export class GpsTrackSession {
  private watchId: string | null = null;
  private points: GpsTrackPoint[] = [];
  private startedAtMs: number | null = null;
  private phase: GpsTrackPhase = "idle";

  getPhase(): GpsTrackPhase {
    return this.phase;
  }

  get isRecording(): boolean {
    return this.phase === "recording" && this.startedAtMs != null;
  }

  getPoints(): readonly GpsTrackPoint[] {
    return this.points;
  }

  getStartedAtMs(): number | null {
    return this.startedAtMs;
  }

  /** Start timer and GPS together (no separate warm-up modal). */
  async startImmediate(): Promise<void> {
    if (!isNativePlatform()) {
      throw new Error("GPS tracking is only available in the Android app.");
    }
    if (this.watchId) return;

    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.requestPermissions();
    if (status.location !== "granted" && status.coarseLocation !== "granted") {
      throw new Error("Location permission is required to track distance.");
    }

    this.points = [];
    this.startedAtMs = Date.now();
    this.phase = "recording";

    this.watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 2_000,
      },
      (position, error) => {
        if (error || !position) return;
        if (this.phase === "recording") {
          this.appendPoint(position);
        }
      },
    );
  }

  /** Request location permission and wait for GPS (timer does not start yet). */
  async prepare(onUpdate?: WatchCallback): Promise<void> {
    if (!isNativePlatform()) {
      throw new Error("GPS tracking is only available in the Android app.");
    }
    if (this.watchId) return;

    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.requestPermissions();
    if (status.location !== "granted" && status.coarseLocation !== "granted") {
      throw new Error("Location permission is required to track distance.");
    }

    this.points = [];
    this.startedAtMs = null;
    this.phase = "watching";

    this.watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 2_000,
      },
      (position, error) => {
        if (error || !position) {
          onUpdate?.(null, error);
          return;
        }
        if (this.phase === "recording") {
          this.appendPoint(position);
        }
        onUpdate?.(position, undefined);
      },
    );
  }

  /** Start the walk timer and distance tally (call after GPS is acquired). */
  beginRecording(): void {
    if (this.phase !== "watching" || !this.watchId) {
      throw new Error("GPS must be ready before starting the walk.");
    }
    this.points = [];
    this.startedAtMs = Date.now();
    this.phase = "recording";
  }

  private appendPoint(position: {
    coords: { latitude: number; longitude: number };
    timestamp: number;
  }): void {
    const point: GpsTrackPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: position.timestamp,
    };
    const last = this.points[this.points.length - 1];
    if (
      !last ||
      haversineDistanceMeters(last, point) >= 3 ||
      point.timestamp - last.timestamp >= 5_000
    ) {
      this.points.push(point);
    }
  }

  async stop(): Promise<GpsTrackSnapshot | null> {
    await this.clearWatch();
    if (this.startedAtMs == null) return null;
    const snapshot = computeGpsTrackSnapshot(this.points, this.startedAtMs);
    this.startedAtMs = null;
    this.phase = "idle";
    return snapshot;
  }

  async dispose(): Promise<void> {
    await this.clearWatch();
    this.points = [];
    this.startedAtMs = null;
    this.phase = "idle";
  }

  private async clearWatch(): Promise<void> {
    if (!this.watchId) return;
    const { Geolocation } = await import("@capacitor/geolocation");
    await Geolocation.clearWatch({ id: this.watchId });
    this.watchId = null;
  }
}
