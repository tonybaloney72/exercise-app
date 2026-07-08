import type {
  GpsTrackingPlugin,
} from "@/lib/geo/gpsTrackingPlugin";

export const GpsTrackingWeb: GpsTrackingPlugin = {
  async startTracking() {
    throw new Error("Foreground GPS tracking is only available in the Android app.");
  },

  async stopTracking() {
    return;
  },

  async openLocationSettings() {
    throw new Error("Location settings are only available in the Android app.");
  },

  async addListener() {
    return {
      remove: async () => undefined,
    };
  },
};
