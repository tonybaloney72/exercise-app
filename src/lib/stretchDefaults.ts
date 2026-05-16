import { exerciseMap } from "@/data/exercises";
import {
  CATALOG_DEFAULT_COOL_DOWN,
  CATALOG_DEFAULT_WARM_UP,
} from "@/lib/dayStretchPlan";
import type { StretchEntry } from "@/types";

/** Validate and dedupe stretch rows from settings JSON or DB. */
export function sanitizeStretchEntries(raw: unknown): StretchEntry[] | null {
  if (!Array.isArray(raw)) return null;
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
  return out.length > 0 ? out : null;
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

export function resolveDefaultWarmUpFromSettings(
  stored: StretchEntry[] | undefined,
  dislikedExerciseIds?: ReadonlySet<string>,
): StretchEntry[] {
  const base = stored?.length
    ? cloneStretchEntries(stored)
    : cloneStretchEntries(CATALOG_DEFAULT_WARM_UP);
  return filterStretchesByDislikes(base, dislikedExerciseIds);
}

export function resolveDefaultCoolDownFromSettings(
  stored: StretchEntry[] | undefined,
  dislikedExerciseIds?: ReadonlySet<string>,
): StretchEntry[] {
  const base = stored?.length
    ? cloneStretchEntries(stored)
    : cloneStretchEntries(CATALOG_DEFAULT_COOL_DOWN);
  return filterStretchesByDislikes(base, dislikedExerciseIds);
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
