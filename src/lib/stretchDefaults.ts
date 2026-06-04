import { exerciseMap } from "@/data/exercises";
import {
  GUEST_FALLBACK_COOL_DOWN,
  GUEST_FALLBACK_WARM_UP,
} from "@/lib/stretchCatalogDefaults";
import type { StretchEntry } from "@/types";

export { GUEST_FALLBACK_COOL_DOWN, GUEST_FALLBACK_WARM_UP };

/** Validate and dedupe stretch rows from settings JSON or DB. */
export function sanitizeStretchEntries(raw: unknown): StretchEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: StretchEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const exerciseId = o.exerciseId;
    const targetReps = o.targetReps;
    if (typeof exerciseId !== "string" || typeof targetReps !== "string") continue;
    if (!exerciseMap[exerciseId]) continue;
    if (seen.has(exerciseId)) continue;
    seen.add(exerciseId);
    out.push({ exerciseId, targetReps });
  }
  return out;
}

export function cloneStretchEntries(entries: StretchEntry[]): StretchEntry[] {
  return entries.map((e) => ({ ...e }));
}

/** Dedupe by `exerciseId` (first occurrence wins). */
export function dedupeStretchEntries(entries: StretchEntry[]): StretchEntry[] {
  const seen = new Set<string>();
  const out: StretchEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.exerciseId)) continue;
    seen.add(entry.exerciseId);
    out.push({ ...entry });
  }
  return out;
}

/**
 * Dedupe, optionally validate against catalog, and remove disliked stretches.
 * Use `validateCatalog` for persisted settings JSON; plan/editor lists skip validation.
 */
export function normalizeStretchList(
  entries: StretchEntry[],
  dislikedExerciseIds?: ReadonlySet<string>,
  options?: { validateCatalog?: boolean },
): StretchEntry[] {
  const base = options?.validateCatalog
    ? sanitizeStretchEntries(entries)
    : dedupeStretchEntries(entries);
  return filterStretchesByDislikes(base, dislikedExerciseIds);
}

/** Ids already used in a stretch list (optionally omit the row being edited). */
export function buildStretchUsedExerciseIds(
  list: readonly StretchEntry[],
  editingIndex?: number | null,
): Set<string> {
  const used = new Set<string>();
  list.forEach((entry, index) => {
    if (editingIndex != null && index === editingIndex) return;
    used.add(entry.exerciseId);
  });
  return used;
}

function filterStretchesByDislikes(
  entries: StretchEntry[],
  dislikedExerciseIds?: ReadonlySet<string>,
): StretchEntry[] {
  if (!dislikedExerciseIds?.size) return entries;
  return entries.filter((e) => !dislikedExerciseIds.has(e.exerciseId));
}

/** Per-day stretch override only when the list is non-empty (empty [] means “use derived”). */
export function hasStretchListOverride(
  entries: StretchEntry[] | null | undefined,
): entries is StretchEntry[] {
  return entries != null && entries.length > 0;
}

export function stretchListsEqual(a: StretchEntry[], b: StretchEntry[]): boolean {
  if (a.length !== b.length) return false;
  const key = (list: StretchEntry[]) =>
    [...list]
      .map((e) => `${e.exerciseId}:${e.targetReps}`)
      .sort()
      .join("|");
  return key(a) === key(b);
}

/**
 * Effective always-include warm-up from settings storage.
 * Signed-in users: empty storage → no defaults (they configure in Settings).
 * Guests: empty storage → catalog universal pool.
 */
export function resolveDefaultWarmUpFromSettings(
  stored: StretchEntry[] | undefined,
  dislikedExerciseIds?: ReadonlySet<string>,
  useCatalogIfEmpty = false,
): StretchEntry[] {
  const base =
    stored != null && stored.length > 0
      ? cloneStretchEntries(stored)
      : useCatalogIfEmpty
        ? cloneStretchEntries(GUEST_FALLBACK_WARM_UP)
        : [];
  return filterStretchesByDislikes(base, dislikedExerciseIds);
}

export function resolveDefaultCoolDownFromSettings(
  stored: StretchEntry[] | undefined,
  dislikedExerciseIds?: ReadonlySet<string>,
  useCatalogIfEmpty = false,
): StretchEntry[] {
  const base =
    stored != null && stored.length > 0
      ? cloneStretchEntries(stored)
      : useCatalogIfEmpty
        ? cloneStretchEntries(GUEST_FALLBACK_COOL_DOWN)
        : [];
  return filterStretchesByDislikes(base, dislikedExerciseIds);
}

/** Stored settings lists with disliked exercises removed (for UI + persistence). */
export function pruneStoredStretchDefaults(
  storedWarmUp: StretchEntry[],
  storedCoolDown: StretchEntry[],
  dislikedExerciseIds: ReadonlySet<string>,
): { defaultWarmUp: StretchEntry[]; defaultCoolDown: StretchEntry[] } {
  return {
    defaultWarmUp: filterStretchesByDislikes(storedWarmUp, dislikedExerciseIds),
    defaultCoolDown: filterStretchesByDislikes(storedCoolDown, dislikedExerciseIds),
  };
}

/** Stable ids for prefs fingerprint when default stretch lists change. */
export function stretchDefaultsFingerprint(
  defaultWarmUp: StretchEntry[],
  defaultCoolDown: StretchEntry[],
): string {
  const w = defaultWarmUp.map((e) => e.exerciseId).sort().join(",");
  const c = defaultCoolDown.map((e) => e.exerciseId).sort().join(",");
  return `su:${w}|sd:${c}`;
}
