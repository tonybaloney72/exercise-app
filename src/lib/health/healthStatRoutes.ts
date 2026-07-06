import type { HealthDailyMetricKey } from "@/types/healthDailyMetrics";

/** Human-readable URL slug ↔ registry metric key. */
const HEALTH_STAT_SLUGS = [
  "steps",
  "heart-rate",
  "resting-heart-rate",
  "blood-oxygen",
  "sleep",
  "vo2-max",
  "weight",
] as const;

export type HealthStatSlug = (typeof HEALTH_STAT_SLUGS)[number];

/** Slugs backed by Health Connect daily metrics (not weight). */
type HealthConnectStatSlug = Exclude<HealthStatSlug, "weight">;

const SLUG_TO_METRIC_KEY: Record<HealthConnectStatSlug, HealthDailyMetricKey> = {
  steps: "steps",
  "heart-rate": "avg_heart_rate_bpm",
  "resting-heart-rate": "resting_heart_rate_bpm",
  "blood-oxygen": "oxygen_saturation_pct",
  sleep: "sleep_total_min",
  "vo2-max": "vo2_max_ml_kg_min",
};

const METRIC_KEY_TO_SLUG: Partial<Record<HealthDailyMetricKey, HealthStatSlug>> =
  Object.fromEntries(
    Object.entries(SLUG_TO_METRIC_KEY).map(([slug, key]) => [key, slug]),
  ) as Partial<Record<HealthDailyMetricKey, HealthStatSlug>>;

export type HealthStatDisplay = {
  slug: HealthStatSlug;
  metricKey: HealthDailyMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  icon: string;
};

export const HEALTH_STAT_DISPLAY: HealthStatDisplay[] = [
  {
    slug: "steps",
    metricKey: "steps",
    label: "Steps",
    shortLabel: "Steps today",
    unit: "count",
    icon: "👟",
  },
  {
    slug: "heart-rate",
    metricKey: "avg_heart_rate_bpm",
    label: "Average heart rate",
    shortLabel: "Avg HR today",
    unit: "bpm",
    icon: "❤️",
  },
  {
    slug: "resting-heart-rate",
    metricKey: "resting_heart_rate_bpm",
    label: "Resting heart rate",
    shortLabel: "Resting HR today",
    unit: "bpm",
    icon: "💓",
  },
  {
    slug: "blood-oxygen",
    metricKey: "oxygen_saturation_pct",
    label: "Blood oxygen",
    shortLabel: "SpO₂ today",
    unit: "%",
    icon: "🫁",
  },
  {
    slug: "sleep",
    metricKey: "sleep_total_min",
    label: "Sleep",
    shortLabel: "Sleep last night",
    unit: "min",
    icon: "😴",
  },
  {
    slug: "vo2-max",
    metricKey: "vo2_max_ml_kg_min",
    label: "VO₂ max",
    shortLabel: "VO₂ max",
    unit: "ml/kg/min",
    icon: "🎯",
  },
  {
    slug: "weight",
    metricKey: "weight_lb",
    label: "Body weight",
    shortLabel: "Weight today",
    unit: "lb",
    icon: "⚖️",
  },
];

export function isHealthStatSlug(value: string): value is HealthStatSlug {
  return (HEALTH_STAT_SLUGS as readonly string[]).includes(value);
}

function metricKeyForHealthStatSlug(
  slug: string,
): HealthDailyMetricKey | undefined {
  if (!isHealthStatSlug(slug) || slug === "weight") return undefined;
  return SLUG_TO_METRIC_KEY[slug];
}

function healthStatSlugForMetricKey(
  key: HealthDailyMetricKey,
): HealthStatSlug | undefined {
  return METRIC_KEY_TO_SLUG[key];
}

export function healthStatDisplayForSlug(
  slug: string,
): HealthStatDisplay | undefined {
  return HEALTH_STAT_DISPLAY.find((row) => row.slug === slug);
}
