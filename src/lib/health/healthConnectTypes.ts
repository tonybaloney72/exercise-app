/** Health Connect scope identifiers (Android native plugin). */
export type HealthDataType =
  | "steps"
  | "distance"
  | "calories"
  | "totalCalories"
  | "heartRate"
  | "restingHeartRate"
  | "oxygenSaturation"
  | "sleep"
  | "vo2Max"
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
  historyReadGranted?: boolean;
  backgroundReadGranted?: boolean;
  /** Granted in HC Settings or via per-session route consent - not bulk-requestable. */
  exerciseRoutesReadGranted?: boolean;
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
  | "heartRate"
  | "restingHeartRate"
  | "oxygenSaturation";

export type ExerciseRoutePoint = {
  lat: number;
  lng: number;
  timestamp: number;
};

export type ExerciseRouteFetchStatus =
  | "data"
  | "consentRequired"
  | "noData"
  | "denied";

export type ExerciseRouteFetchResult = {
  status: ExerciseRouteFetchStatus;
  points: ExerciseRoutePoint[];
};

export type SleepDayTotals = {
  sleepTotalMin: number;
  sleepDeepMin: number;
  sleepRemMin: number;
  sleepLightMin: number;
  sleepAwakeMin: number;
  dateKey: string;
};

export type Vo2MaxReading = {
  value: number;
  time: string;
};
