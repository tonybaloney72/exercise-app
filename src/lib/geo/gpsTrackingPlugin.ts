import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type GpsTrackingLocationUpdate = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
};

export type GpsTrackingErrorEvent = {
  message: string;
};

export interface GpsTrackingPlugin {
  startTracking(options?: {
    title?: string;
    body?: string;
  }): Promise<void>;
  stopTracking(): Promise<void>;
  openLocationSettings(): Promise<void>;
  addListener(
    eventName: "locationUpdate",
    listenerFunc: (event: GpsTrackingLocationUpdate) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "error",
    listenerFunc: (event: GpsTrackingErrorEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const GpsTracking = registerPlugin<GpsTrackingPlugin>("GpsTracking", {
  web: () => import("@/lib/geo/gpsTrackingPlugin.web").then((m) => m.GpsTrackingWeb),
});

export function isForegroundGpsTrackingAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
