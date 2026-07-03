/** Health Connect UI categories + extensible daily metric storage. */
export type HealthMetricCategory =
  | "activity"
  | "body_measurements"
  | "cycle_tracking"
  | "nutrition"
  | "sleep"
  | "vitals"
  | "wellness";

export type HealthMetricAggMethod = "sum" | "avg" | "last" | "max" | "min";

/** Stable metric ids stored in `health_daily_metrics.metric_key`. */
export type HealthDailyMetricKey =
  | "steps"
  | "active_kcal"
  | "distance_m"
  | "floors_climbed"
  | "avg_heart_rate_bpm"
  | "resting_heart_rate_bpm"
  | "weight_lb"
  | "body_fat_pct"
  | "height_in"
  | "sleep_total_min"
  | "sleep_deep_min"
  | "sleep_rem_min"
  | "sleep_light_min"
  | "sleep_awake_min"
  | "vo2_max_ml_kg_min"
  | "hydration_ml"
  | "calories_consumed"
  | "protein_g"
  | "blood_pressure_systolic"
  | "blood_pressure_diastolic"
  | "blood_glucose_mg_dl"
  | "oxygen_saturation_pct"
  | "respiratory_rate_bpm"
  | "body_temperature_f"
  | "mindfulness_min";

export interface HealthDailyMetricRecord {
  logDate: string;
  category: HealthMetricCategory;
  metricKey: HealthDailyMetricKey;
  valueNum: number | null;
  valueJson: Record<string, unknown> | null;
  unit: string;
  aggMethod: HealthMetricAggMethod;
  source: string;
  syncedAt: string;
}

export type HealthDailyMetricUpsert = Omit<
  HealthDailyMetricRecord,
  "syncedAt"
> & {
  syncedAt?: string;
};
