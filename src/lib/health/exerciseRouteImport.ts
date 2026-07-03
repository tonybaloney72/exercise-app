import type { GpsTrackPoint } from "@/lib/geo/gpsTrackSession";
import { requestNativeExerciseRoute } from "@/lib/health/nativeHealth";

/** Request HC exercise route (may show per-session consent UI). */
export async function fetchHealthConnectExerciseRoute(
  platformId: string | undefined,
): Promise<readonly GpsTrackPoint[]> {
  if (!platformId?.trim()) return [];
  const result = await requestNativeExerciseRoute(platformId);
  if (result.status !== "data" || result.points.length < 2) return [];
  return result.points.map((point) => ({
    lat: point.lat,
    lng: point.lng,
    timestamp: point.timestamp,
  }));
}
