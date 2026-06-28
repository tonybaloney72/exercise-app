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

function seenArraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
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

function saveLocalReleaseNotesSeenIds(ids: readonly string[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    const next = [...new Set(ids)];
    const raw = localStorage.getItem(RELEASE_NOTES_SEEN_STORAGE_KEY);
    const current = parseSeenIds(raw);
    if (seenArraysEqual(next, [...current])) return;
    localStorage.setItem(RELEASE_NOTES_SEEN_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore private browsing / quota errors.
  }
}

/** Merge local + remote seen ids; persist union to both when signed in. */
export async function loadReleaseNotesSeenIds(
  remoteIds: string[] = [],
): Promise<string[]> {
  const local = getLocalReleaseNotesSeenIds();
  const merged = new Set([...local, ...remoteIds]);
  const result = [...merged];

  if (seenArraysEqual(result, remoteIds)) {
    saveLocalReleaseNotesSeenIds(result);
    return result;
  }

  saveLocalReleaseNotesSeenIds(result);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return result;
  }

  const { error } = await supabase
    .from("user_settings")
    .update({ release_notes_seen_ids: result })
    .eq("user_id", user.id);
  if (error) {
    console.error("[loadReleaseNotesSeenIds.sync]", error);
  }

  return result;
}

/** Record dismissals locally and in Supabase for signed-in users. */
export async function markReleaseNotesSeen(noteIds: string[]): Promise<string[]> {
  if (noteIds.length === 0) return [...getLocalReleaseNotesSeenIds()];

  const merged = new Set(getLocalReleaseNotesSeenIds());
  for (const id of noteIds) merged.add(id);
  const result = [...merged];
  saveLocalReleaseNotesSeenIds(result);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { error } = await supabase
      .from("user_settings")
      .update({ release_notes_seen_ids: result })
      .eq("user_id", user.id);
    if (error) {
      console.error("[markReleaseNotesSeen]", error);
    }
  }

  return result;
}

export function releaseNotesSeenIdsEqual(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return seenArraysEqual(a, b);
}
