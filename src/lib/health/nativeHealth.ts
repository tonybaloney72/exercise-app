import { Health } from "@capgo/capacitor-health";
import type {
  AuthorizationOptions,
  AuthorizationStatus,
  HealthDataType,
  QueryWorkoutsOptions,
  Workout,
} from "@capgo/capacitor-health";
import { withTimeout } from "@/lib/async/withTimeout";
import { clientTrace, clientTraceAsync } from "@/lib/diagnostics/clientTrace";
import { isNativePlatform } from "@/lib/capacitorRuntime";

export const NATIVE_HEALTH_SILENT_TIMEOUT_MS = 10_000;
/** Permission UI — user may need time to read Health Connect screens. */
export const NATIVE_HEALTH_INTERACTIVE_TIMEOUT_MS = 120_000;

const HEALTH_CONNECT_SETTINGS_INTENT =
  "intent:#Intent;action=androidx.health.ACTION_HEALTH_CONNECT_SETTINGS;end";

export const CARDIO_HEALTH_READ_TYPES: HealthDataType[] = [
  "workouts",
  "distance",
  "calories",
  "heartRate",
  "steps",
];

export const CARDIO_HEALTH_WRITE_TYPES: HealthDataType[] = [
  "distance",
  "calories",
];

export type HealthBridgeTestResult = {
  ok: boolean;
  pluginVersion?: string;
  available?: boolean;
  platform?: string;
  reason?: string;
  error?: string;
};

async function runTimedNativeCall<T>(
  event: string,
  fn: () => Promise<T>,
  timeoutMs: number,
  data?: Record<string, unknown>,
): Promise<T> {
  return clientTraceAsync(
    "health-native",
    event,
    () =>
      withTimeout(
        fn(),
        timeoutMs,
        `Health Connect ${event} timed out after ${timeoutMs}ms`,
      ),
    data,
  );
}

/** Runs once at app startup on native to register the Health plugin early. */
export async function probeNativeHealthBridgeOnStartup(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { version } = await withTimeout(
      Health.getPluginVersion(),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
      "Health bridge probe timed out",
    );
    clientTrace("health-native", "bridge_eager_ok", { version });
  } catch (err) {
    clientTrace(
      "health-native",
      "bridge_eager_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "warn",
    );
  }
}

export async function testNativeHealthBridge(): Promise<HealthBridgeTestResult> {
  if (!isNativePlatform()) {
    return { ok: false, error: "Not on native platform" };
  }
  try {
    const { version } = await runTimedNativeCall(
      "getPluginVersion",
      () => Health.getPluginVersion(),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
    );
    const availability = await runTimedNativeCall(
      "isAvailable",
      () => Health.isAvailable(),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
    );
    clientTrace("health-native", "bridge_test_ok", {
      version,
      available: availability.available,
      platform: availability.platform,
    });
    return {
      ok: true,
      pluginVersion: version,
      available: availability.available,
      platform: availability.platform,
      reason: availability.reason,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    clientTrace(
      "health-native",
      "bridge_test_failed",
      { message },
      "error",
    );
    return { ok: false, error: message };
  }
}

/**
 * Some devices hang on {@link Health.isAvailable}; treat timeout as unavailable.
 * Prefer {@link checkNativeHealthAuthorization} on user-initiated flows.
 */
export async function isNativeHealthAvailable(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    return await runTimedNativeCall(
      "isAvailable",
      () => Health.isAvailable().then((a) => a.available),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
    );
  } catch (err) {
    clientTrace(
      "health-native",
      "isAvailable_unavailable",
      { message: err instanceof Error ? err.message : String(err) },
      "warn",
    );
    return false;
  }
}

export async function requestNativeHealthAuthorization(
  options: AuthorizationOptions,
): Promise<AuthorizationStatus | null> {
  if (!isNativePlatform()) return null;
  try {
    return await runTimedNativeCall(
      "requestAuthorization",
      () => Health.requestAuthorization(options),
      NATIVE_HEALTH_INTERACTIVE_TIMEOUT_MS,
      {
        read: options.read,
        write: options.write,
      },
    );
  } catch (err) {
    clientTrace(
      "health-native",
      "requestAuthorization_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "error",
    );
    return null;
  }
}

export async function checkNativeHealthAuthorization(
  options: AuthorizationOptions,
): Promise<AuthorizationStatus | null> {
  if (!isNativePlatform()) return null;
  try {
    return await runTimedNativeCall(
      "checkAuthorization",
      () => Health.checkAuthorization(options),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
      {
        read: options.read,
        write: options.write,
      },
    );
  } catch (err) {
    clientTrace(
      "health-native",
      "checkAuthorization_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "warn",
    );
    return null;
  }
}

export async function queryNativeWorkouts(
  options: QueryWorkoutsOptions,
): Promise<Workout[]> {
  if (!isNativePlatform()) return [];
  try {
    const { workouts } = await runTimedNativeCall(
      "queryWorkouts",
      () => Health.queryWorkouts(options),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
      {
        workoutType: options.workoutType,
        startDate: options.startDate,
        endDate: options.endDate,
        limit: options.limit,
      },
    );
    return workouts;
  } catch {
    return [];
  }
}

export async function readNativeHealthSamples(options: {
  dataType: HealthDataType;
  startDate: string;
  endDate: string;
  limit?: number;
}) {
  if (!isNativePlatform()) return [];
  try {
    const { samples } = await runTimedNativeCall(
      "readSamples",
      () => Health.readSamples(options),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
      {
        dataType: options.dataType,
        startDate: options.startDate,
        endDate: options.endDate,
        limit: options.limit,
      },
    );
    return samples;
  } catch {
    return [];
  }
}

export async function writeNativeHealthSample(options: {
  dataType: HealthDataType;
  value: number;
  startDate: string;
  endDate: string;
}): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await runTimedNativeCall(
      "saveSample",
      () => Health.saveSample(options),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
      { dataType: options.dataType },
    );
  } catch {
    // Optional mirror to Health Connect.
  }
}

async function fallbackOpenHealthConnectSettings(): Promise<boolean> {
  clientTrace("health-native", "openHealthConnectSettings_fallback", {});
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: HEALTH_CONNECT_SETTINGS_INTENT });
    clientTrace("health-native", "openHealthConnectSettings_fallback_ok", {});
    return true;
  } catch (err) {
    clientTrace(
      "health-native",
      "openHealthConnectSettings_fallback_intent_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "warn",
    );
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({
      url: "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata",
    });
    clientTrace("health-native", "openHealthConnectSettings_fallback_store", {});
    return true;
  } catch (err) {
    clientTrace(
      "health-native",
      "openHealthConnectSettings_fallback_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "error",
    );
    return false;
  }
}

export async function openNativeHealthSettings(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    await runTimedNativeCall(
      "openHealthConnectSettings",
      () => Health.openHealthConnectSettings(),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
    );
    return true;
  } catch (err) {
    clientTrace(
      "health-native",
      "openHealthConnectSettings_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "error",
    );
    return fallbackOpenHealthConnectSettings();
  }
}
