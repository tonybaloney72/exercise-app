import releaseNotesJson from "@/data/releaseNotes.json";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { getInstalledNativeApkBuildId } from "@/lib/nativeApkVersion";
import { compareSemver } from "@/lib/semverVersionCode";
import packageJson from "../../package.json";

export type ReleaseNote = {
  version: string;
  date: string;
  highlights: string[];
};

const STORAGE_KEY = "release-notes-last-seen-version";

export const RELEASE_NOTES: ReleaseNote[] = [...releaseNotesJson].sort((a, b) =>
  compareSemver(b.version, a.version),
);

export async function resolveAppReleaseVersion(): Promise<string> {
  if (isNativePlatform()) {
    const native = await getInstalledNativeApkBuildId();
    if (native) return native;
  }
  const env = process.env.NEXT_PUBLIC_APP_VERSION?.trim();
  return env && env.length > 0 ? env : packageJson.version;
}

export function getLastSeenReleaseNotesVersion(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY)?.trim();
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function markReleaseNotesSeen(version: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const current = getLastSeenReleaseNotesVersion();
    const next =
      current && compareSemver(current, version) > 0 ? current : version;
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Ignore private browsing / quota errors.
  }
}

/** Release notes the user has not dismissed, for versions at or below the running app. */
export function getUnseenReleaseNotes(
  appVersion: string,
  lastSeen: string | null = getLastSeenReleaseNotesVersion(),
): ReleaseNote[] {
  const baseline = lastSeen ?? "0.0.0";
  return RELEASE_NOTES.filter(
    (note) =>
      compareSemver(note.version, baseline) > 0 &&
      compareSemver(note.version, appVersion) <= 0,
  ).sort((a, b) => compareSemver(b.version, a.version));
}

/** All release notes shipped at or before the running app version (newest first). */
export function getReleaseNotesForAppVersion(appVersion: string): ReleaseNote[] {
  return RELEASE_NOTES.filter(
    (note) => compareSemver(note.version, appVersion) <= 0,
  ).sort((a, b) => compareSemver(b.version, a.version));
}

export function formatReleaseNoteDate(dateKey: string): string {
  const parts = dateKey.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateKey;
  const [year, month, day] = parts;
  const d = new Date(year!, month! - 1, day);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
