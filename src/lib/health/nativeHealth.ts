import type {
  AuthorizationOptions,
  AuthorizationStatus,
  HealthDataType,
  QueryWorkoutsOptions,
  Workout,
} from "@capgo/capacitor-health";
import { clientTraceAsync } from "@/lib/diagnostics/clientTrace";
import { isNativePlatform } from "@/lib/capacitorRuntime";

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

export async function isNativeHealthAvailable(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  return clientTraceAsync("health-native", "isAvailable", async () => {
    try {
      const Health = await getHealthPlugin();
      const availability = await Health.isAvailable();
      return availability.available;
    } catch {
      return false;
    }
  });
}

export async function requestNativeHealthAuthorization(
  options: AuthorizationOptions,
): Promise<AuthorizationStatus | null> {
  if (!isNativePlatform()) return null;
  return clientTraceAsync(
    "health-native",
    "requestAuthorization",
    async () => {
      const Health = await getHealthPlugin();
      return Health.requestAuthorization(options);
    },
    {
      read: options.read,
      write: options.write,
    },
  );
}

export async function checkNativeHealthAuthorization(
  options: AuthorizationOptions,
): Promise<AuthorizationStatus | null> {
  if (!isNativePlatform()) return null;
  return clientTraceAsync(
    "health-native",
    "checkAuthorization",
    async () => {
      const Health = await getHealthPlugin();
      return Health.checkAuthorization(options);
    },
    {
      read: options.read,
      write: options.write,
    },
  );
}

export async function queryNativeWorkouts(
  options: QueryWorkoutsOptions,
): Promise<Workout[]> {
  if (!isNativePlatform()) return [];
  const { workouts } = await clientTraceAsync(
    "health-native",
    "queryWorkouts",
    async () => {
      const Health = await getHealthPlugin();
      return Health.queryWorkouts(options);
    },
    {
      workoutType: options.workoutType,
      startDate: options.startDate,
      endDate: options.endDate,
      limit: options.limit,
    },
  );
  return workouts;
}

export async function readNativeHealthSamples(options: {
  dataType: HealthDataType;
  startDate: string;
  endDate: string;
  limit?: number;
}) {
  if (!isNativePlatform()) return [];
  const { samples } = await clientTraceAsync(
    "health-native",
    "readSamples",
    async () => {
      const Health = await getHealthPlugin();
      return Health.readSamples(options);
    },
    {
      dataType: options.dataType,
      startDate: options.startDate,
      endDate: options.endDate,
      limit: options.limit,
    },
  );
  return samples;
}

export async function writeNativeHealthSample(options: {
  dataType: HealthDataType;
  value: number;
  startDate: string;
  endDate: string;
}): Promise<void> {
  if (!isNativePlatform()) return;
  await clientTraceAsync(
    "health-native",
    "saveSample",
    async () => {
      const Health = await getHealthPlugin();
      await Health.saveSample(options);
    },
    { dataType: options.dataType },
  );
}

export async function openNativeHealthSettings(): Promise<void> {
  if (!isNativePlatform()) return;
  await clientTraceAsync("health-native", "openHealthConnectSettings", async () => {
    const Health = await getHealthPlugin();
    await Health.openHealthConnectSettings();
  });
}
