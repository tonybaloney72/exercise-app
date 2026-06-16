import type {
  AuthorizationOptions,
  AuthorizationStatus,
  HealthDataType,
  QueryWorkoutsOptions,
  Workout,
} from "@capgo/capacitor-health";
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
  try {
    const Health = await getHealthPlugin();
    const availability = await Health.isAvailable();
    return availability.available;
  } catch {
    return false;
  }
}

export async function requestNativeHealthAuthorization(
  options: AuthorizationOptions,
): Promise<AuthorizationStatus | null> {
  if (!isNativePlatform()) return null;
  const Health = await getHealthPlugin();
  return Health.requestAuthorization(options);
}

export async function checkNativeHealthAuthorization(
  options: AuthorizationOptions,
): Promise<AuthorizationStatus | null> {
  if (!isNativePlatform()) return null;
  const Health = await getHealthPlugin();
  return Health.checkAuthorization(options);
}

export async function queryNativeWorkouts(
  options: QueryWorkoutsOptions,
): Promise<Workout[]> {
  if (!isNativePlatform()) return [];
  const Health = await getHealthPlugin();
  const { workouts } = await Health.queryWorkouts(options);
  return workouts;
}

export async function readNativeHealthSamples(options: {
  dataType: HealthDataType;
  startDate: string;
  endDate: string;
  limit?: number;
}) {
  if (!isNativePlatform()) return [];
  const Health = await getHealthPlugin();
  const { samples } = await Health.readSamples(options);
  return samples;
}

export async function writeNativeHealthSample(options: {
  dataType: HealthDataType;
  value: number;
  startDate: string;
  endDate: string;
}): Promise<void> {
  if (!isNativePlatform()) return;
  const Health = await getHealthPlugin();
  await Health.saveSample(options);
}

export async function openNativeHealthSettings(): Promise<void> {
  if (!isNativePlatform()) return;
  const Health = await getHealthPlugin();
  await Health.openHealthConnectSettings();
}
