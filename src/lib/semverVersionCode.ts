/** Parse `major.minor.patch` (supports 0.10.12-style versions). */
function parseSemverTriplet(version: string): [number, number, number] | null {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Monotonic Android `versionCode` from semver (0.9.0 → 900, 0.10.12 → 1012). */
export function semverToAndroidVersionCode(version: string): number {
  const parts = parseSemverTriplet(version);
  if (!parts) return 1;
  const [major, minor, patch] = parts;
  return major * 10000 + minor * 100 + patch;
}

export function compareSemver(a: string, b: string): number {
  const left = parseSemverTriplet(a);
  const right = parseSemverTriplet(b);
  if (!left || !right) return a.localeCompare(b);
  for (let i = 0; i < 3; i += 1) {
    if (left[i]! !== right[i]!) return left[i]! - right[i]!;
  }
  return 0;
}
