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

async function getHealthPlugin() {
  const { Health } = await import("@capgo/capacitor-health");
  return Health;
}

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

/**
 * Some devices hang on {@link Health.isAvailable}; treat timeout as unavailable.
 * Prefer {@link checkNativeHealthAuthorization} on user-initiated flows.
 */
export async function isNativeHealthAvailable(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    return await runTimedNativeCall(
      "isAvailable",
      async () => {
        const Health = await getHealthPlugin();
        const availability = await Health.isAvailable();
        return availability.available;
      },
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
      async () => {
        const Health = await getHealthPlugin();
        return Health.requestAuthorization(options);
      },
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
      async () => {
        const Health = await getHealthPlugin();
        return Health.checkAuthorization(options);
      },
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
      async () => {
        const Health = await getHealthPlugin();
        return Health.queryWorkouts(options);
      },
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
      async () => {
        const Health = await getHealthPlugin();
        return Health.readSamples(options);
      },
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
      async () => {
        const Health = await getHealthPlugin();
        await Health.saveSample(options);
      },
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
      { dataType: options.dataType },
    );
  } catch {
    // Optional mirror to Health Connect.
  }
}

export async function openNativeHealthSettings(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await runTimedNativeCall(
      "openHealthConnectSettings",
      async () => {
        const Health = await getHealthPlugin();
        await Health.openHealthConnectSettings();
      },
      NATIVE_HEALTH_SILENT_TIMEOUT_MS,
    );
  } catch (err) {
    clientTrace(
      "health-native",
      "openHealthConnectSettings_failed",
      { message: err instanceof Error ? err.message : String(err) },
      "error",
    );
  }
}
