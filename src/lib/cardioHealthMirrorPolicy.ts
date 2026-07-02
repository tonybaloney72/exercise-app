import type { CardioActivitySource } from "@/types";

type CardioMirrorResolution =
  | "health_connect_session"
  | "health_connect_samples"
  | "gps"
  | "timer_only";

/** ME-originated captures only — skip re-writing sessions already imported from HC. */
export function shouldMirrorCardioCaptureToHealth(options: {
  healthSource?: CardioActivitySource;
  resolution?: CardioMirrorResolution | null;
}): boolean {
  if (options.healthSource === "health_connect") return false;
  if (
    options.resolution === "health_connect_session" ||
    options.resolution === "health_connect_samples"
  ) {
    return false;
  }
  return true;
}
