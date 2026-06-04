import { seededCandidateRank } from "@/lib/exerciseCandidates";
import {
  dedupeStretchEntries,
  hasStretchListOverride,
  normalizeStretchList,
} from "@/lib/stretchDefaults";
import {
  allCoolDownCatalogPool,
  warmSessionCatalogPool,
  type StretchThemePoolId,
} from "@/lib/stretchCatalogPools";
import type { StretchResolveContext } from "@/lib/stretchResolveContext";
import {
  shouldIncludeStretchPool,
  stretchWarmUpQuota,
} from "@/lib/trainingPriorityStretches";
import { shouldSkipStretchesForPlan } from "@/lib/restDays";
import type { DayPlan, ExerciseCategory, StretchEntry } from "@/types";

export type ResolvedDayStretches = {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
};

/** Prescribed cool-down count from the catalog generator (not counting user overrides). */
export const COOL_DOWN_STRETCHES_PER_DAY = 5;

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

function isLightRecoveryDay(plan: DayPlan): boolean {
  if (plan.strengthFocus.length > 0) return false;
  const slotCount = plan.rounds.reduce((n, r) => n + r.exercises.length, 0);
  return slotCount <= 6;
}

function deriveWarmUp(plan: DayPlan, ctx: StretchResolveContext): StretchEntry[] {
  const recovery = isLightRecoveryDay(plan);
  const cats = categoriesInPlan(plan);
  const preset = ctx.trainingPriorityPreset;
  const { trainingPriorityScores: scores, trainingPriorityCustomized: customized } =
    ctx;
  const daySeed = `d${plan.dayOfWeek}-tp:${preset}`;
  const warmParts: StretchEntry[] = [...ctx.defaultWarmUp];

  const poolIds: StretchThemePoolId[] = [
    "upper",
    "lower",
    "core",
    "conditioning",
  ];

  for (const id of poolIds) {
    if (!shouldIncludeStretchPool(id, plan, cats, preset, scores, customized))
      continue;
    let quota = stretchWarmUpQuota(id, preset, scores, customized);
    if (recovery) quota = Math.max(1, Math.ceil(quota * 0.6));
    if (quota <= 0) continue;
    appendPickedPool(
      warmParts,
      warmSessionCatalogPool(id),
      quota,
      `${ctx.weekRotationKey}-${daySeed}-warm-${id}`,
      ctx,
      mergeExcludeIds(ctx.weekUsedStretchIds),
    );
  }

  return dedupeStretchEntries(warmParts);
}

function deriveCoolDown(
  plan: DayPlan,
  ctx: StretchResolveContext,
  warmExerciseIds: ReadonlySet<string>,
): StretchEntry[] {
  const preset = ctx.trainingPriorityPreset;
  const daySeed = `d${plan.dayOfWeek}-tp:${preset}`;
  const seed = `${ctx.weekRotationKey}-${daySeed}-cool-all`;
  const defaults = dedupeStretchEntries([...ctx.defaultCoolDown]);
  const usedIds = new Set(defaults.map((e) => e.exerciseId));
  const slotsLeft = Math.max(0, COOL_DOWN_STRETCHES_PER_DAY - defaults.length);

  const picks =
    slotsLeft > 0
      ? pickStretchEntries(
          allCoolDownCatalogPool(),
          slotsLeft,
          seed,
          ctx.dislikedExerciseIds,
          mergeExcludeIds(warmExerciseIds, usedIds),
        )
      : [];

  const merged = dedupeStretchEntries([...defaults, ...picks]);
  return merged.slice(0, COOL_DOWN_STRETCHES_PER_DAY);
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

/** Recompute warm-up / cool-down from settings defaults + day focus. */
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
 * Warm-up / cool-down for a prescribed day. Per-day overrides win; otherwise derived
 * from settings defaults, training priorities, and rounds. Disliked stretches are excluded.
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
