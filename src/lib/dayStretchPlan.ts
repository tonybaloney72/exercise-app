import {
  dedupeStretchEntries,
  normalizeStretchList,
} from "@/lib/stretchDefaults";
import {
  coolDownCatalogPool,
  warmUpCatalogPool,
  type StretchThemePoolId,
} from "@/lib/stretchCatalogPools";
import type { StretchResolveContext } from "@/lib/stretchResolveContext";
import {
  shouldIncludeStretchPool,
  stretchCoolDownQuota,
  stretchWarmUpQuota,
} from "@/lib/trainingPriorityStretches";
import { shouldSkipStretchesForPlan } from "@/lib/restDays";
import type { DayPlan, ExerciseCategory, StretchEntry } from "@/types";

export {
  CATALOG_DEFAULT_COOL_DOWN,
  CATALOG_DEFAULT_WARM_UP,
} from "@/lib/stretchCatalogDefaults";

function seedOffset(seed: string, modulus: number): number {
  if (modulus <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) >>> 0;
  }
  return hash % modulus;
}

/**
 * Deterministic rotating subset from a catalog pool (uses full library, not just list head).
 */
export function pickStretchEntries(
  pool: readonly StretchEntry[],
  count: number,
  seed: string,
  dislikedExerciseIds: ReadonlySet<string>,
): StretchEntry[] {
  if (count <= 0) return [];
  const available = pool.filter((e) => !dislikedExerciseIds.has(e.exerciseId));
  if (available.length === 0) return [];

  const take = Math.min(count, available.length);
  const offset = seedOffset(seed, available.length);
  const out: StretchEntry[] = [];
  for (let i = 0; i < take; i++) {
    out.push({ ...available[(offset + i) % available.length]! });
  }
  return out;
}

function appendPickedPool(
  parts: StretchEntry[],
  pool: readonly StretchEntry[],
  count: number,
  seed: string,
  ctx: StretchResolveContext,
): void {
  parts.push(
    ...pickStretchEntries(pool, count, seed, ctx.dislikedExerciseIds),
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
    "general",
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
      warmUpCatalogPool(id),
      quota,
      `${ctx.weekRotationKey}-${daySeed}-warm-${id}`,
      ctx,
    );
  }

  return dedupeStretchEntries(warmParts);
}

function deriveCoolDown(plan: DayPlan, ctx: StretchResolveContext): StretchEntry[] {
  const recovery = isLightRecoveryDay(plan);
  const cats = categoriesInPlan(plan);
  const preset = ctx.trainingPriorityPreset;
  const { trainingPriorityScores: scores, trainingPriorityCustomized: customized } =
    ctx;
  const daySeed = `d${plan.dayOfWeek}-tp:${preset}`;
  const coolParts: StretchEntry[] = [...ctx.defaultCoolDown];

  const poolIds: StretchThemePoolId[] = [
    "general",
    "upper",
    "lower",
    "core",
  ];

  for (const id of poolIds) {
    if (!shouldIncludeStretchPool(id, plan, cats, preset, scores, customized))
      continue;
    let quota = stretchCoolDownQuota(id, preset, scores, customized);
    if (recovery) quota = Math.max(1, Math.ceil(quota * 0.6));
    if (quota <= 0) continue;
    appendPickedPool(
      coolParts,
      coolDownCatalogPool(id),
      quota,
      `${ctx.weekRotationKey}-${daySeed}-cool-${id}`,
      ctx,
    );
  }

  return dedupeStretchEntries(coolParts);
}

/** Recompute warm-up / cool-down from settings defaults + day focus. */
export function rebuildDerivedStretches(
  plan: DayPlan,
  ctx: StretchResolveContext,
): {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
} {
  return {
    warmUp: deriveWarmUp(plan, ctx),
    coolDown: deriveCoolDown(plan, ctx),
  };
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
  return {
    warmUp:
      plan.warmUp != null
        ? normalizeStretchList(plan.warmUp, dislikedExerciseIds)
        : deriveWarmUp(plan, ctx),
    coolDown:
      plan.coolDown != null
        ? normalizeStretchList(plan.coolDown, dislikedExerciseIds)
        : deriveCoolDown(plan, ctx),
  };
}
