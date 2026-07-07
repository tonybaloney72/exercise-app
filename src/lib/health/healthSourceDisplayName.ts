/** Known Health Connect writer package names → friendly labels. */
const HEALTH_SOURCE_PACKAGE_LABELS: Readonly<Record<string, string>> = {
  "com.nothing.smartcenter": "Nothing Watch",
  "com.google.android.apps.fitness": "Google Fit",
  "com.google.android.apps.wearables": "Pixel Watch",
  "com.sec.android.app.shealth": "Samsung Health",
  "com.samsung.android.apps.watchhealth": "Samsung Health",
  "com.garmin.android.apps.connectmobile": "Garmin Connect",
  "com.fitbit.FitbitMobile": "Fitbit",
  "com.mi.health": "Mi Fitness",
  "com.huawei.health": "Huawei Health",
  "com.oneplus.healthconnect": "OnePlus Health",
  "com.ouraring.oura": "Oura",
  "com.withings.wiscale2": "Withings",
  "com.polar.polarflow": "Polar Flow",
  "com.strava": "Strava",
  "com.heytap.health": "Oppo Health",
  "com.realme.link": "realme Link",
};

const PACKAGE_NAME_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;

export function looksLikePackageName(value: string): boolean {
  return PACKAGE_NAME_RE.test(value.trim());
}

function guessLabelFromPackage(packageName: string): string {
  const parts = packageName.split(".").filter(Boolean);
  const skip = new Set(["com", "android", "app", "apps", "mobile", "health"]);
  const meaningful = parts.filter((part) => !skip.has(part.toLowerCase()));
  const brand = meaningful[0] ?? parts[parts.length - 1] ?? packageName;
  return brand
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export type HealthSourceRef = {
  sourceId?: string | null;
  sourceName?: string | null;
};

/**
 * Resolve a user-facing label for a Health Connect data origin.
 * Prefers device labels, then curated package map, then heuristics.
 */
export function formatHealthSourceDisplayName(
  source?: HealthSourceRef,
): string | undefined {
  const sourceId = source?.sourceId?.trim();
  const sourceName = source?.sourceName?.trim();
  if (!sourceId && !sourceName) return undefined;

  if (sourceName && !looksLikePackageName(sourceName)) {
    return sourceName;
  }

  const packageKey = sourceId ?? (sourceName && looksLikePackageName(sourceName) ? sourceName : undefined);
  if (packageKey) {
    const mapped = HEALTH_SOURCE_PACKAGE_LABELS[packageKey];
    if (mapped) return mapped;
    if (looksLikePackageName(packageKey)) {
      return guessLabelFromPackage(packageKey);
    }
  }

  return sourceName;
}

/** Normalize before persisting to exercise logs. */
export function normalizeHealthSourceDisplayName(
  source?: HealthSourceRef,
): string | undefined {
  const label = formatHealthSourceDisplayName(source);
  return label?.trim() || undefined;
}

/** Format a stored log value (handles legacy raw package names). */
export function displayHealthSourceName(
  stored?: string | null,
  sourceId?: string | null,
): string | undefined {
  return (
    formatHealthSourceDisplayName({
      sourceId: sourceId ?? (stored && looksLikePackageName(stored) ? stored : undefined),
      sourceName: stored,
    }) ?? undefined
  );
}
