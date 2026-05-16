import { exerciseMap } from "@/data/exercises";
import {
  CATALOG_DEFAULT_COOL_DOWN,
  CATALOG_DEFAULT_WARM_UP,
} from "@/lib/dayStretchPlan";
import type { StretchEntry } from "@/types";

/** Guest mode: catalog universal stretches when the user has not chosen any. */
export const GUEST_FALLBACK_WARM_UP: StretchEntry[] = CATALOG_DEFAULT_WARM_UP.map(
  (e) => ({ ...e }),
);
export const GUEST_FALLBACK_COOL_DOWN: StretchEntry[] = CATALOG_DEFAULT_COOL_DOWN.map(
  (e) => ({ ...e }),
);

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

export function filterStretchesByDislikes(
  entries: StretchEntry[],
  dislikedExerciseIds?: ReadonlySet<string>,
): StretchEntry[] {
  if (!dislikedExerciseIds?.size) return entries;
  return entries.filter((e) => !dislikedExerciseIds.has(e.exerciseId));
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
