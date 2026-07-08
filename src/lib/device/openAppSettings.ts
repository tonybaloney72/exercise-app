import { Capacitor } from "@capacitor/core";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";
import {
  AppSettingsNative,
  isAndroidAppSettingsAvailable,
} from "@/lib/device/appSettingsPlugin";

function canUseLocalNotifications(): boolean {
  return (
    isNativePlatform() && Capacitor.isPluginAvailable("LocalNotifications")
  );
}

/** Opens Android Settings → Apps → MyExercise (all app permissions). */
export async function openNativeAppSettings(): Promise<boolean> {
  if (!isAndroidAppSettingsAvailable()) return false;
  try {
    await AppSettingsNative.openAppSettings();
    clientTrace("device-settings", "openAppSettings_ok", {});
    return true;
  } catch (err) {
    clientTrace(
      "device-settings",
      "openAppSettings_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "error",
    );
    return false;
  }
}

/** Opens Android notification settings for MyExercise. */
export async function openNativeNotificationSettings(): Promise<boolean> {
  if (!isAndroidAppSettingsAvailable()) return false;
  try {
    await AppSettingsNative.openNotificationSettings();
    clientTrace("device-settings", "openNotificationSettings_ok", {});
    return true;
  } catch (err) {
    clientTrace(
      "device-settings",
      "openNotificationSettings_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "error",
    );
    return false;
  }
}

export async function checkNativeNotificationPermission(): Promise<boolean | null> {
  if (!canUseLocalNotifications()) return null;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const status = await LocalNotifications.checkPermissions();
    return status.display === "granted";
  } catch {
    return null;
  }
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!canUseLocalNotifications()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return true;
    const requested = await LocalNotifications.requestPermissions();
    const granted = requested.display === "granted";
    clientTrace("device-settings", "requestNotificationPermission", { granted });
    return granted;
  } catch (err) {
    clientTrace(
      "device-settings",
      "requestNotificationPermission_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "error",
    );
    return false;
  }
}
