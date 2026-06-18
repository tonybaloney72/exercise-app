import { isNativePlatform } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";

const LOCATION_SOURCE_SETTINGS_INTENT =
  "intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end";

/** Opens Android system location settings (GPS / network location). */
export async function openNativeLocationSettings(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: LOCATION_SOURCE_SETTINGS_INTENT });
    clientTrace("geo", "openLocationSettings_ok", {});
    return true;
  } catch (err) {
    clientTrace(
      "geo",
      "openLocationSettings_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "error",
    );
    return false;
  }
}

/** Prompts for fine/coarse location (used by GPS cardio tracking). */
export async function requestNativeLocationPermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.requestPermissions();
    const granted =
      status.location === "granted" || status.coarseLocation === "granted";
    clientTrace("geo", "requestLocationPermission", { granted });
    return granted;
  } catch (err) {
    clientTrace(
      "geo",
      "requestLocationPermission_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "error",
    );
    return false;
  }
}
