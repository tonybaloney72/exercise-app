import releaseNotesJson from "@/data/releaseNotes.json";

export type ReleaseNote = {
  id: string;
  date: string;
  /** Optional heading in What's new UI; falls back to formatted date. */
  title?: string;
  highlights: string[];
};

/** Maximum release notes shipped in the app bundle. */
export const MAX_BUNDLED_RELEASE_NOTES = 3;

const RELEASE_NOTES: ReleaseNote[] = [...releaseNotesJson].sort(
  compareReleaseNotesByRecency,
);

function compareReleaseNotesByRecency(a: ReleaseNote, b: ReleaseNote): number {
  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) return byDate;
  return b.id.localeCompare(a.id);
}

/** Newest bundled release note, if any. */
export function getLatestReleaseNote(): ReleaseNote | undefined {
  return RELEASE_NOTES[0];
}

/** Up to `limit` newest bundled notes (Settings history). */
export function getRecentReleaseNotes(
  limit = MAX_BUNDLED_RELEASE_NOTES,
): ReleaseNote[] {
  return RELEASE_NOTES.slice(0, limit);
}

/** Newest note the user has not dismissed yet (What's New modal). */
export function getLatestUnseenReleaseNote(
  seenIds: Set<string>,
): ReleaseNote | undefined {
  const latest = getLatestReleaseNote();
  if (!latest || seenIds.has(latest.id)) return undefined;
  return latest;
}

/** All bundled notes in the current deploy (newest first). */
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

export { markReleaseNotesSeen } from "@/lib/releaseNotesSeen";
