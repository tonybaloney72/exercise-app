import { isNativePlatform } from "@/lib/capacitorRuntime";

/** Installed APK `versionName` from the native shell (null on web). */
export async function getInstalledNativeApkBuildId(): Promise<string | null> {
  if (!isNativePlatform()) return null;
  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    return info.version?.trim() || null;
  } catch {
    return null;
  }
}
