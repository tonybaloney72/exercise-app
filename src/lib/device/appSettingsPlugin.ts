import { Capacitor, registerPlugin } from "@capacitor/core";

export interface AppSettingsPlugin {
  openAppSettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
}

export const AppSettingsNative = registerPlugin<AppSettingsPlugin>("AppSettings", {
  web: () =>
    import("@/lib/device/appSettingsPlugin.web").then((m) => m.AppSettingsWeb),
});

export function isAndroidAppSettingsAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
