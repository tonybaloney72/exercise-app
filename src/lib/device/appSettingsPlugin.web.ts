import type { AppSettingsPlugin } from "@/lib/device/appSettingsPlugin";

export const AppSettingsWeb: AppSettingsPlugin = {
  async openAppSettings() {
    throw new Error("App settings are only available in the Android app.");
  },

  async openNotificationSettings() {
    throw new Error("Notification settings are only available in the Android app.");
  },
};
