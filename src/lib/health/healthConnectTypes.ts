/** Health Connect scope identifiers (Android native plugin). */
export type HealthDataType =
  | "steps"
  | "distance"
  | "calories"
  | "totalCalories"
  | "heartRate"
  | "restingHeartRate"
  | "weight"
  | "workouts";

/** Capgo-compatible workout type slug from Health Connect exercise sessions. */
export type WorkoutType = string;

export interface AuthorizationOptions {
  read?: HealthDataType[];
  write?: HealthDataType[];
}

export interface AuthorizationStatus {
  readAuthorized: HealthDataType[];
  readDenied: HealthDataType[];
  writeAuthorized: HealthDataType[];
  writeDenied: HealthDataType[];
}

export interface AvailabilityResult {
  available: boolean;
  platform?: "android" | "ios" | "web";
  reason?: string;
}

export interface Workout {
  workoutType: WorkoutType;
  duration: number;
  totalEnergyBurned?: number;
  totalDistance?: number;
  startDate: string;
  endDate: string;
  sourceName?: string;
  sourceId?: string;
  platformId?: string;
}

export type HealthConnectRangeMetric =
  | "steps"
  | "calories"
  | "totalCalories"
  | "distance"
  | "heartRate";
