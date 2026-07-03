import type {
  AuthorizationOptions,
  AuthorizationStatus,
  ExerciseRouteFetchResult,
  HealthDataType,
  SleepDayTotals,
  Vo2MaxReading,
  Workout,
} from "@/lib/health/healthConnectTypes";
import {
  HealthConnectNative,
  isAndroidNative,
} from "@/lib/health/healthConnectPlugin";
import { withTimeout } from "@/lib/async/withTimeout";
import { clientTrace, clientTraceAsync } from "@/lib/diagnostics/clientTrace";
import { isNativePlatform } from "@/lib/capacitorRuntime";

const NATIVE_HEALTH_SILENT_TIMEOUT_MS = 10_000;
/** Permission UI — user may need time to read Health Connect screens. */
const NATIVE_HEALTH_INTERACTIVE_TIMEOUT_MS = 120_000;

const HEALTH_CONNECT_SETTINGS_INTENT =
  "intent:#Intent;action=androidx.health.ACTION_HEALTH_CONNECT_SETTINGS;end";

/** Scopes requested for cardio read + Progress daily health (matches AndroidManifest). */
export const CARDIO_HEALTH_READ_TYPES: HealthDataType[] = [
  "workouts",
  "steps",
  "distance",
  "calories",
  "totalCalories",
  "heartRate",
  "restingHeartRate",
  "oxygenSaturation",
  "sleep",
  "vo2Max",
];

export const CARDIO_HEALTH_WRITE_TYPES: HealthDataType[] = [
  "distance",
  "calories",
  "weight",
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
  if (!isAndroidNative()) return;
  try {
    const { version } = await withTimeout(
      HealthConnectNative.getPluginVersion(),
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
  if (!isAndroidNative()) {
    return { ok: false, error: "Not on native Android" };
  }
  try {
    const { version } = await runTimedNativeCall(
      "getPluginVersion",
      () => HealthConnectNative.getPluginVersion(),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
    );
    const availability = await runTimedNativeCall(
      "isAvailable",
      () => HealthConnectNative.isAvailable(),
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

export async function isNativeHealthAvailable(): Promise<boolean> {
  if (!isAndroidNative()) return false;
  try {
    return await runTimedNativeCall(
      "isAvailable",
      () => HealthConnectNative.isAvailable().then((a) => a.available),
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
  if (!isAndroidNative()) return null;
  try {
    return await runTimedNativeCall(
      "requestAuthorization",
      () => HealthConnectNative.requestAuthorization(options),
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
  if (!isAndroidNative()) return null;
  try {
    return await runTimedNativeCall(
      "checkAuthorization",
      () => HealthConnectNative.checkAuthorization(options),
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

export async function queryNativeWorkouts(options: {
  startDate: string;
  endDate: string;
  limit?: number;
  ascending?: boolean;
}): Promise<Workout[]> {
  if (!isAndroidNative()) return [];
  try {
    const { workouts } = await runTimedNativeCall(
      "queryExerciseSessions",
      () => HealthConnectNative.queryExerciseSessions(options),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
      {
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

export async function requestNativeExerciseRoute(
  platformId: string,
): Promise<ExerciseRouteFetchResult> {
  if (!isAndroidNative() || !platformId.trim()) {
    return { status: "noData", points: [] };
  }
  try {
    return await runTimedNativeCall(
      "requestExerciseRoute",
      () => HealthConnectNative.requestExerciseRoute({ platformId }),
      NATIVE_HEALTH_INTERACTIVE_TIMEOUT_MS,
      { platformId },
    );
  } catch (err) {
    clientTrace(
      "health-native",
      "requestExerciseRoute_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "warn",
    );
    return { status: "noData", points: [] };
  }
}

export async function queryNativeSleepDayTotals(options: {
  dateKey: string;
  isToday: boolean;
}): Promise<SleepDayTotals | undefined> {
  if (!isAndroidNative()) return undefined;
  try {
    return await runTimedNativeCall(
      "querySleepDayTotals",
      () => HealthConnectNative.querySleepDayTotals(options),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
      options,
    );
  } catch {
    return undefined;
  }
}

export async function queryNativeLatestVo2Max(): Promise<
  Vo2MaxReading | undefined
> {
  if (!isAndroidNative()) return undefined;
  try {
    const result = await runTimedNativeCall(
      "queryLatestVo2Max",
      () => HealthConnectNative.queryLatestVo2Max(),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
    );
    if (result.value == null || !Number.isFinite(result.value)) return undefined;
    return { value: result.value, time: result.time ?? new Date().toISOString() };
  } catch {
    return undefined;
  }
}

export async function queryNativeVo2MaxHistory(options: {
  startDate: string;
  endDate: string;
}): Promise<Vo2MaxReading[]> {
  if (!isAndroidNative()) return [];
  try {
    const { readings } = await runTimedNativeCall(
      "queryVo2MaxHistory",
      () => HealthConnectNative.queryVo2MaxHistory(options),
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
    );
    return readings ?? [];
  } catch {
    return [];
  }
}

export async function writeNativeHealthSample(options: {
  dataType: "distance" | "calories" | "weight";
  value: number;
  startDate: string;
  endDate: string;
}): Promise<void> {
  if (!isAndroidNative()) return;
  try {
    await runTimedNativeCall(
      "writeHealthSample",
      () => HealthConnectNative.writeHealthSample(options),
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
  if (!isAndroidNative()) return false;
  try {
    await runTimedNativeCall(
      "openHealthConnectSettings",
      () => HealthConnectNative.openHealthConnectSettings(),
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
