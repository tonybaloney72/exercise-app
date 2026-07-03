import type { HealthDataType } from "@/lib/health/healthConnectTypes";
import type {
  HealthDailyMetricKey,
  HealthMetricAggMethod,
  HealthMetricCategory,
} from "@/types/healthDailyMetrics";

export interface HealthMetricDefinition {
  key: HealthDailyMetricKey;
  category: HealthMetricCategory;
  unit: string;
  aggMethod: HealthMetricAggMethod;
  /** When set, daily rollup reads this HC sample type on native. */
  hcDataType?: HealthDataType;
  /** Included in native → DB sync today. */
  syncEnabled: boolean;
}

const HEALTH_METRIC_DEFINITIONS: Record<
  HealthDailyMetricKey,
  HealthMetricDefinition
> = {
  steps: {
    key: "steps",
    category: "activity",
    unit: "count",
    aggMethod: "sum",
    hcDataType: "steps",
    syncEnabled: true,
  },
  active_kcal: {
    key: "active_kcal",
    category: "activity",
    unit: "kcal",
    aggMethod: "sum",
    hcDataType: "calories",
    syncEnabled: true,
  },
  distance_m: {
    key: "distance_m",
    category: "activity",
    unit: "m",
    aggMethod: "sum",
    hcDataType: "distance",
    syncEnabled: false,
  },
  floors_climbed: {
    key: "floors_climbed",
    category: "activity",
    unit: "count",
    aggMethod: "sum",
    syncEnabled: false,
  },
  avg_heart_rate_bpm: {
    key: "avg_heart_rate_bpm",
    category: "vitals",
    unit: "bpm",
    aggMethod: "avg",
    hcDataType: "heartRate",
    syncEnabled: true,
  },
  resting_heart_rate_bpm: {
    key: "resting_heart_rate_bpm",
    category: "vitals",
    unit: "bpm",
    aggMethod: "avg",
    hcDataType: "restingHeartRate",
    syncEnabled: true,
  },
  weight_lb: {
    key: "weight_lb",
    category: "body_measurements",
    unit: "lb",
    aggMethod: "last",
    syncEnabled: false,
  },
  body_fat_pct: {
    key: "body_fat_pct",
    category: "body_measurements",
    unit: "percent",
    aggMethod: "last",
    syncEnabled: false,
  },
  height_in: {
    key: "height_in",
    category: "body_measurements",
    unit: "in",
    aggMethod: "last",
    syncEnabled: false,
  },
  sleep_total_min: {
    key: "sleep_total_min",
    category: "sleep",
    unit: "min",
    aggMethod: "sum",
    hcDataType: "sleep",
    syncEnabled: true,
  },
  sleep_deep_min: {
    key: "sleep_deep_min",
    category: "sleep",
    unit: "min",
    aggMethod: "sum",
    hcDataType: "sleep",
    syncEnabled: true,
  },
  sleep_rem_min: {
    key: "sleep_rem_min",
    category: "sleep",
    unit: "min",
    aggMethod: "sum",
    hcDataType: "sleep",
    syncEnabled: true,
  },
  sleep_light_min: {
    key: "sleep_light_min",
    category: "sleep",
    unit: "min",
    aggMethod: "sum",
    hcDataType: "sleep",
    syncEnabled: true,
  },
  sleep_awake_min: {
    key: "sleep_awake_min",
    category: "sleep",
    unit: "min",
    aggMethod: "sum",
    hcDataType: "sleep",
    syncEnabled: true,
  },
  vo2_max_ml_kg_min: {
    key: "vo2_max_ml_kg_min",
    category: "vitals",
    unit: "ml/kg/min",
    aggMethod: "last",
    hcDataType: "vo2Max",
    syncEnabled: true,
  },
  hydration_ml: {
    key: "hydration_ml",
    category: "nutrition",
    unit: "ml",
    aggMethod: "sum",
    syncEnabled: false,
  },
  calories_consumed: {
    key: "calories_consumed",
    category: "nutrition",
    unit: "kcal",
    aggMethod: "sum",
    syncEnabled: false,
  },
  protein_g: {
    key: "protein_g",
    category: "nutrition",
    unit: "g",
    aggMethod: "sum",
    syncEnabled: false,
  },
  blood_pressure_systolic: {
    key: "blood_pressure_systolic",
    category: "vitals",
    unit: "mmHg",
    aggMethod: "last",
    syncEnabled: false,
  },
  blood_pressure_diastolic: {
    key: "blood_pressure_diastolic",
    category: "vitals",
    unit: "mmHg",
    aggMethod: "last",
    syncEnabled: false,
  },
  blood_glucose_mg_dl: {
    key: "blood_glucose_mg_dl",
    category: "vitals",
    unit: "mg/dL",
    aggMethod: "last",
    syncEnabled: false,
  },
  oxygen_saturation_pct: {
    key: "oxygen_saturation_pct",
    category: "vitals",
    unit: "percent",
    aggMethod: "avg",
    hcDataType: "oxygenSaturation",
    syncEnabled: true,
  },
  respiratory_rate_bpm: {
    key: "respiratory_rate_bpm",
    category: "vitals",
    unit: "bpm",
    aggMethod: "avg",
    syncEnabled: false,
  },
  body_temperature_f: {
    key: "body_temperature_f",
    category: "vitals",
    unit: "f",
    aggMethod: "last",
    syncEnabled: false,
  },
  mindfulness_min: {
    key: "mindfulness_min",
    category: "wellness",
    unit: "min",
    aggMethod: "sum",
    syncEnabled: false,
  },
};

export const SYNC_ENABLED_HEALTH_METRIC_KEYS = (
  Object.values(HEALTH_METRIC_DEFINITIONS) as HealthMetricDefinition[]
)
  .filter((def) => def.syncEnabled)
  .map((def) => def.key);

export function healthMetricDefinition(
  key: HealthDailyMetricKey,
): HealthMetricDefinition {
  return HEALTH_METRIC_DEFINITIONS[key];
}
