import { Capacitor, registerPlugin } from "@capacitor/core";
import type {
  AuthorizationStatus,
  AvailabilityResult,
  ExerciseRouteFetchResult,
  HealthConnectRangeMetric,
  HealthDataType,
  HealthDayRecordType,
  HealthDayRecordsResult,
  SleepDayTotals,
  Vo2MaxReading,
  Workout,
} from "@/lib/health/healthConnectTypes";

type HealthConnectNativePlugin = {
  isAvailable(): Promise<AvailabilityResult>;
  getPluginVersion(): Promise<{ version: string }>;
  checkAuthorization(options: {
    read?: HealthDataType[];
    write?: HealthDataType[];
  }): Promise<AuthorizationStatus>;
  requestAuthorization(options: {
    read?: HealthDataType[];
    write?: HealthDataType[];
  }): Promise<AuthorizationStatus>;
  openHealthConnectSettings(): Promise<void>;
  queryExerciseSessions(options: {
    startDate: string;
    endDate: string;
    limit?: number;
    ascending?: boolean;
  }): Promise<{ workouts: Workout[] }>;
  queryRangeTotal(options: {
    dataType: HealthConnectRangeMetric;
    startDate: string;
    endDate: string;
  }): Promise<{ value: number }>;
  queryLocalDayTotal(options: {
    dateKey: string;
    isToday: boolean;
    dataType: HealthConnectRangeMetric;
  }): Promise<{ value: number; dateKey: string; isToday: boolean }>;
  querySleepDayTotals(options: {
    dateKey: string;
    isToday: boolean;
  }): Promise<SleepDayTotals>;
  queryLatestVo2Max(): Promise<{ value?: number; time?: string }>;
  queryVo2MaxHistory(options: {
    startDate: string;
    endDate: string;
  }): Promise<{ readings: Vo2MaxReading[] }>;
  queryDayRecords(options: {
    dateKey: string;
    isToday: boolean;
    recordType: HealthDayRecordType;
  }): Promise<HealthDayRecordsResult>;
  requestExerciseRoute(options: {
    platformId: string;
  }): Promise<ExerciseRouteFetchResult>;
  writeHealthSample(options: {
    dataType: "distance" | "calories" | "weight";
    value: number;
    startDate: string;
    endDate: string;
  }): Promise<void>;
};

export const HealthConnectNative = registerPlugin<HealthConnectNativePlugin>(
  "HealthConnect",
);

export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
