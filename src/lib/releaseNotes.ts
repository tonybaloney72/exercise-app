import releaseNotesJson from "@/data/releaseNotes.json";

export type ReleaseNote = {
  id: string;
  date: string;
  /** Optional heading in What's new UI; falls back to formatted date. */
  title?: string;
  highlights: string[];
};

const STORAGE_KEY = "release-notes-seen-ids";
const LEGACY_STORAGE_KEY = "release-notes-last-seen-version";

/** Maps dismissed semver keys from the old release-notes flow. */
const LEGACY_SEEN_ID_MAP: Record<string, string[]> = {
  "0.20.0": ["2026-06-20-health-connect"],
};

const RELEASE_NOTES: ReleaseNote[] = [...releaseNotesJson].sort(
  compareReleaseNotesByRecency,
);

function compareReleaseNotesByRecency(a: ReleaseNote, b: ReleaseNote): number {
  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) return byDate;
  return b.id.localeCompare(a.id);
}

function parseSeenIds(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function getSeenReleaseNoteIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const seen = parseSeenIds(localStorage.getItem(STORAGE_KEY));
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)?.trim();
    if (legacy) {
      for (const id of LEGACY_SEEN_ID_MAP[legacy] ?? []) {
        seen.add(id);
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
    }
    return seen;
  } catch {
    return new Set();
  }
}

export function markReleaseNotesSeen(noteIds: string[]): void {
  if (typeof localStorage === "undefined" || noteIds.length === 0) return;
  try {
    const seen = getSeenReleaseNoteIds();
    for (const id of noteIds) seen.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // Ignore private browsing / quota errors.
  }
}

/** Release notes bundled in this web deploy that the user has not dismissed. */
export function getUnseenReleaseNotes(
  seenIds: Set<string> = getSeenReleaseNoteIds(),
): ReleaseNote[] {
  return RELEASE_NOTES.filter((note) => !seenIds.has(note.id));
}

/** All release notes in the current bundle (newest first). */
export function getAllReleaseNotes(): ReleaseNote[] {
  return RELEASE_NOTES;
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

export function releaseNoteHeading(note: ReleaseNote): string {
  const title = note.title?.trim();
  return title && title.length > 0 ? title : formatReleaseNoteDate(note.date);
}
