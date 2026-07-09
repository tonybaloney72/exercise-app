import { Capacitor } from "@capacitor/core";

/** True when running inside a Capacitor native shell (Android APK). */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** True on the Android Capacitor shell (barcode scan and other Android-only features). */
export function isAndroidNative(): boolean {
  return isNativePlatform() && Capacitor.getPlatform() === "android";
}

/** True when the UI was built for bundled static export (`CAPACITOR_BUILD=1`). */
export function isCapacitorBundledBuild(): boolean {
  return process.env.NEXT_PUBLIC_CAPACITOR === "1";
}
