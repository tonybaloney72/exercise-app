import { seededCandidateRank } from "@/lib/exerciseCandidates";
import {
  dedupeStretchEntries,
  hasStretchListOverride,
  normalizeStretchList,
} from "@/lib/stretchDefaults";
import {
  coolDownCatalogPool,
  warmSessionCatalogPool,
  type StretchThemePoolId,
} from "@/lib/stretchCatalogPools";
import type { StretchResolveContext } from "@/lib/stretchResolveContext";
import { includedStretchPoolsForDay } from "@/lib/stretchDayFocus";
import { shouldSkipStretchesForPlan } from "@/lib/restDays";
import type { TrainingWeekDays } from "@/lib/repos";
import type { DayPlan, ExerciseCategory, StretchEntry } from "@/types";

export type ResolvedDayStretches = {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
};

function mergeExcludeIds(
  ...sets: (ReadonlySet<string> | undefined)[]
): ReadonlySet<string> {
  const merged = new Set<string>();
  for (const s of sets) {
    if (!s) continue;
    for (const id of s) merged.add(id);
  }
  return merged;
}

function recordStretchUsage(
  weekUsed: Set<string>,
  entries: readonly StretchEntry[],
): void {
  for (const e of entries) weekUsed.add(e.exerciseId);
}

/**
 * Deterministic pseudo-random subset: seed shuffles the pool (not catalog id order).
 * Same seed → same picks; different day/pool seeds → different spreads.
 */
export function pickStretchEntries(
  pool: readonly StretchEntry[],
  count: number,
  seed: string,
  dislikedExerciseIds: ReadonlySet<string>,
  excludeExerciseIds: ReadonlySet<string> = new Set(),
): StretchEntry[] {
  if (count <= 0) return [];
  const available = pool.filter(
    (e) =>
      !dislikedExerciseIds.has(e.exerciseId) &&
      !excludeExerciseIds.has(e.exerciseId),
  );
  if (available.length === 0) return [];

  const take = Math.min(count, available.length);
  const ranked = [...available].sort((a, b) => {
    const aExcluded = excludeExerciseIds.has(a.exerciseId) ? 1 : 0;
    const bExcluded = excludeExerciseIds.has(b.exerciseId) ? 1 : 0;
    if (aExcluded !== bExcluded) return aExcluded - bExcluded;
    const bySeed = seededCandidateRank(seed, a.exerciseId).localeCompare(
      seededCandidateRank(seed, b.exerciseId),
    );
    if (bySeed !== 0) return bySeed;
    return a.exerciseId.localeCompare(b.exerciseId);
  });
  return ranked.slice(0, take).map((entry) => ({ ...entry }));
}

function appendPickedPool(
  parts: StretchEntry[],
  pool: readonly StretchEntry[],
  count: number,
  seed: string,
  ctx: StretchResolveContext,
  excludeExerciseIds: ReadonlySet<string> = new Set(),
): void {
  parts.push(
    ...pickStretchEntries(
      pool,
      count,
      seed,
      ctx.dislikedExerciseIds,
      excludeExerciseIds,
    ),
  );
}

function categoriesInPlan(plan: DayPlan): Set<ExerciseCategory> {
  const cats = new Set<ExerciseCategory>();
  for (const g of plan.strengthFocus) cats.add(g);
  for (const g of plan.coreGroups) cats.add(g);
  for (const round of plan.rounds) {
    for (const ex of round.exercises) {
      cats.add(ex.category);
    }
  }
  return cats;
}

/** Strength + cardio slots already on the plan — skip the same ids in warm-up picks. */
function prescribedExerciseIdsInPlan(plan: DayPlan): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const round of plan.rounds) {
    for (const ex of round.exercises) {
      ids.add(ex.exerciseId);
    }
  }
  for (const cardio of plan.cardioActivities ?? []) {
    ids.add(cardio.exerciseId);
  }
  return ids;
}

function isLightRecoveryDay(plan: DayPlan): boolean {
  if (plan.strengthFocus.length > 0) return false;
  const slotCount = plan.rounds.reduce((n, r) => n + r.exercises.length, 0);
  return slotCount <= 6;
}

function poolForSection(
  poolId: StretchThemePoolId,
  section: "warm" | "cool",
): readonly StretchEntry[] {
  return section === "warm"
    ? warmSessionCatalogPool(poolId)
    : coolDownCatalogPool(poolId);
}

function pickThemedStretchesForDay(
  plan: DayPlan,
  targetCount: number,
  section: "warm" | "cool",
  ctx: StretchResolveContext,
  extraExclude: ReadonlySet<string> = new Set(),
): StretchEntry[] {
  if (targetCount <= 0) return [];
  const cats = categoriesInPlan(plan);
  const included = includedStretchPoolsForDay(plan, cats);
  if (included.length === 0) return [];

  const daySeed = `d${plan.dayOfWeek}`;
  const exclude = mergeExcludeIds(ctx.weekUsedStretchIds, extraExclude);
  const parts: StretchEntry[] = [];
  let slotsLeft = targetCount;

  for (const id of included) {
    if (slotsLeft <= 0) break;
    const before = parts.length;
    appendPickedPool(
      parts,
      poolForSection(id, section),
      1,
      `${ctx.weekRotationKey}-${daySeed}-${section}-${id}`,
      ctx,
      mergeExcludeIds(exclude, new Set(parts.map((e) => e.exerciseId))),
    );
    slotsLeft -= parts.length - before;
  }

  if (slotsLeft > 0) {
    const combined = included.flatMap((id) => poolForSection(id, section));
    appendPickedPool(
      parts,
      combined,
      slotsLeft,
      `${ctx.weekRotationKey}-${daySeed}-${section}-fill`,
      ctx,
      mergeExcludeIds(exclude, new Set(parts.map((e) => e.exerciseId))),
    );
  }

  return dedupeStretchEntries(parts).slice(0, targetCount);
}

function effectiveWarmUpCount(plan: DayPlan, ctx: StretchResolveContext): number {
  let count = ctx.warmUpStretchCount;
  if (isLightRecoveryDay(plan)) {
    count = Math.max(1, Math.ceil(count * 0.6));
  }
  return count;
}

function deriveWarmUp(plan: DayPlan, ctx: StretchResolveContext): StretchEntry[] {
  const count = effectiveWarmUpCount(plan, ctx);
  return pickThemedStretchesForDay(
    plan,
    count,
    "warm",
    ctx,
    prescribedExerciseIdsInPlan(plan),
  );
}

function deriveCoolDown(
  plan: DayPlan,
  ctx: StretchResolveContext,
  warmExerciseIds: ReadonlySet<string>,
): StretchEntry[] {
  return pickThemedStretchesForDay(
    plan,
    ctx.coolDownStretchCount,
    "cool",
    ctx,
    warmExerciseIds,
  );
}

/**
 * Resolve warm-up / cool-down for Sun–Sat in order so catalog picks avoid repeats
 * across the week when possible.
 */
export function resolveStretchesForWeekSequential(
  weekPlans: readonly (DayPlan | null | undefined)[],
  ctx: StretchResolveContext,
): (ResolvedDayStretches | null)[] {
  const weekUsed = new Set<string>();
  const out: (ResolvedDayStretches | null)[] = [];

  for (let d = 0; d < 7; d++) {
    const plan = weekPlans[d];
    if (!plan) {
      out.push(null);
      continue;
    }
    const dayCtx: StretchResolveContext = {
      ...ctx,
      weekUsedStretchIds: weekUsed,
    };
    const result = resolveStretchesForDay(plan, dayCtx);
    recordStretchUsage(weekUsed, result.warmUp);
    out.push(result);
  }

  return out;
}

function warmIdsFromEntries(entries: StretchEntry[]): ReadonlySet<string> {
  return new Set(entries.map((e) => e.exerciseId));
}

/** Recompute warm-up / cool-down from day focus and configured counts. */
export function rebuildDerivedStretches(
  plan: DayPlan,
  ctx: StretchResolveContext,
): {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
} {
  const warmUp = deriveWarmUp(plan, ctx);
  const coolDown = deriveCoolDown(plan, ctx, warmIdsFromEntries(warmUp));
  return { warmUp, coolDown };
}

/**
 * Materialize stretch lists onto each day in a generated week (persisted on save).
 */
export function materializeStretchesOntoWeek(
  weekPlans: TrainingWeekDays,
  ctx: StretchResolveContext,
): TrainingWeekDays {
  const weekUsed = new Set<string>();
  const out: TrainingWeekDays = {};

  for (let d = 0; d < 7; d++) {
    const plan = weekPlans[d];
    if (!plan) continue;
    if (shouldSkipStretchesForPlan(plan)) {
      out[d] = { ...plan, warmUp: [], coolDown: [] };
      continue;
    }
    const dayCtx: StretchResolveContext = {
      ...ctx,
      weekUsedStretchIds: weekUsed,
    };
    const { warmUp, coolDown } = rebuildDerivedStretches(plan, dayCtx);
    recordStretchUsage(weekUsed, warmUp);
    out[d] = { ...plan, warmUp, coolDown };
  }

  return out;
}

/**
 * Warm-up / cool-down for a prescribed day. Per-day overrides win; otherwise derived
 * from configured counts and day focus. Disliked stretches are excluded.
 */
export function resolveStretchesForDay(
  plan: DayPlan,
  ctx: StretchResolveContext,
): {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
} {
  if (shouldSkipStretchesForPlan(plan)) {
    return { warmUp: [], coolDown: [] };
  }
  const { dislikedExerciseIds } = ctx;

  const warmOverride = hasStretchListOverride(plan.warmUp);
  const coolOverride = hasStretchListOverride(plan.coolDown);

  if (warmOverride && coolOverride) {
    return {
      warmUp: normalizeStretchList(plan.warmUp!, dislikedExerciseIds),
      coolDown: normalizeStretchList(plan.coolDown!, dislikedExerciseIds),
    };
  }

  if (warmOverride) {
    const warmUp = normalizeStretchList(plan.warmUp!, dislikedExerciseIds);
    return {
      warmUp,
      coolDown: deriveCoolDown(plan, ctx, warmIdsFromEntries(warmUp)),
    };
  }

  if (coolOverride) {
    return {
      warmUp: deriveWarmUp(plan, ctx),
      coolDown: normalizeStretchList(plan.coolDown!, dislikedExerciseIds),
    };
  }

  return rebuildDerivedStretches(plan, ctx);
}
