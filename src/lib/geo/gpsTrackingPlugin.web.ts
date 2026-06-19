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

  async addListener() {
    return {
      remove: async () => undefined,
    };
  },
};
