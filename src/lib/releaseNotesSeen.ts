import { createClient } from "@/lib/supabase/client";

export const RELEASE_NOTES_SEEN_STORAGE_KEY = "release-notes-seen-ids";
const LEGACY_STORAGE_KEY = "release-notes-last-seen-version";

/** Maps dismissed semver keys from the old release-notes flow. */
const LEGACY_SEEN_ID_MAP: Record<string, string[]> = {
  "0.20.0": ["2026-06-20-health-connect"],
};

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

/** Local dismissals (guests, cache, and pre-login dismissals). */
export function getLocalReleaseNotesSeenIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const seen = parseSeenIds(localStorage.getItem(RELEASE_NOTES_SEEN_STORAGE_KEY));
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)?.trim();
    if (legacy) {
      for (const id of LEGACY_SEEN_ID_MAP[legacy] ?? []) {
        seen.add(id);
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.setItem(
        RELEASE_NOTES_SEEN_STORAGE_KEY,
        JSON.stringify([...seen]),
      );
    }
    return seen;
  } catch {
    return new Set();
  }
}

function saveLocalReleaseNotesSeenIds(ids: Iterable<string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      RELEASE_NOTES_SEEN_STORAGE_KEY,
      JSON.stringify([...new Set(ids)]),
    );
  } catch {
    // Ignore private browsing / quota errors.
  }
}

function seenSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

/** Merge local + remote seen ids; persist union to both when signed in. */
export async function loadReleaseNotesSeenIds(
  remoteIds: string[] = [],
): Promise<string[]> {
  const local = getLocalReleaseNotesSeenIds();
  const merged = new Set([...local, ...remoteIds]);
  saveLocalReleaseNotesSeenIds(merged);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [...merged];
  }

  const remote = new Set(remoteIds);
  if (!seenSetsEqual(merged, remote)) {
    const { error } = await supabase
      .from("user_settings")
      .update({ release_notes_seen_ids: [...merged] })
      .eq("user_id", user.id);
    if (error) {
      console.error("[loadReleaseNotesSeenIds.sync]", error);
    }
  }

  return [...merged];
}

/** Record dismissals locally and in Supabase for signed-in users. */
export async function markReleaseNotesSeen(noteIds: string[]): Promise<string[]> {
  if (noteIds.length === 0) return [...getLocalReleaseNotesSeenIds()];

  const merged = new Set(getLocalReleaseNotesSeenIds());
  for (const id of noteIds) merged.add(id);
  saveLocalReleaseNotesSeenIds(merged);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { error } = await supabase
      .from("user_settings")
      .update({ release_notes_seen_ids: [...merged] })
      .eq("user_id", user.id);
    if (error) {
      console.error("[markReleaseNotesSeen]", error);
    }
  }

  return [...merged];
}
