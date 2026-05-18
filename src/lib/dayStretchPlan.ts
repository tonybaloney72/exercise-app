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
import type {
  DayPlan,
  ExerciseCategory,
  ProgramFocusPreset,
  StretchEntry,
} from "@/types";

export {
  CATALOG_DEFAULT_COOL_DOWN,
  CATALOG_DEFAULT_WARM_UP,
} from "@/lib/stretchCatalogDefaults";

const UPPER_STRENGTH: ExerciseCategory[] = ["UP", "UPL"];
const LOWER_STRENGTH: ExerciseCategory[] = ["LB"];
const CORE_GROUPS: ExerciseCategory[] = ["CF", "CL", "CR", "CS"];

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

const BASE_WARM_QUOTAS: Record<StretchThemePoolId, number> = {
  general: 2,
  upper: 2,
  lower: 3,
  core: 2,
  conditioning: 2,
};

const BASE_COOL_QUOTAS: Record<StretchThemePoolId, number> = {
  general: 1,
  upper: 3,
  lower: 3,
  core: 2,
  conditioning: 0,
};

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

function dayHasLowerStrength(
  plan: DayPlan,
  cats: Set<ExerciseCategory>,
): boolean {
  return (
    plan.strengthFocus.some((c) => LOWER_STRENGTH.includes(c)) || cats.has("LB")
  );
}

function includeWarmPool(
  pool: StretchThemePoolId,
  plan: DayPlan,
  cats: Set<ExerciseCategory>,
  focus: ProgramFocusPreset,
): boolean {
  const hasUpper =
    plan.strengthFocus.some((c) => UPPER_STRENGTH.includes(c)) ||
    cats.has("UP") ||
    cats.has("UPL");
  const hasLower = dayHasLowerStrength(plan, cats);
  const hasCore =
    plan.coreGroups.length > 0 || CORE_GROUPS.some((c) => cats.has(c));
  const hasPc = plan.strengthFocus.includes("PC") || cats.has("PC");

  switch (pool) {
    case "general":
      return true;
    case "upper":
      return hasUpper || focus === "upper_body" || focus === "strength";
    case "lower":
      if (focus === "upper_body" && !hasLower) return false;
      if (hasLower) return true;
      if (focus === "lower_body") return true;
      if (focus === "conditioning" && (hasPc || plan.hasJog)) return true;
      if (focus === "balanced" && plan.hasJog) return true;
      return false;
    case "core":
      if (focus === "minimal_core") return false;
      if (focus === "core_emphasis") return true;
      return hasCore;
    case "conditioning":
      if (focus === "conditioning") return true;
      return hasPc;
    default:
      return false;
  }
}

function warmUpQuota(pool: StretchThemePoolId, focus: ProgramFocusPreset): number {
  switch (focus) {
    case "conditioning":
      if (pool === "conditioning") return 4;
      if (pool === "core") return 0;
      if (pool === "lower") return 3;
      if (pool === "upper") return 2;
      if (pool === "general") return 2;
      break;
    case "minimal_core":
      if (pool === "core") return 0;
      if (pool === "general") return 2;
      break;
    case "core_emphasis":
      if (pool === "core") return 4;
      break;
    case "upper_body":
      if (pool === "upper") return 4;
      if (pool === "lower") return 0;
      break;
    case "lower_body":
      if (pool === "lower") return 5;
      if (pool === "upper") return 2;
      break;
    case "strength":
      if (pool === "upper" || pool === "lower") return 3;
      break;
    default:
      break;
  }
  return BASE_WARM_QUOTAS[pool];
}

function coolDownQuota(pool: StretchThemePoolId, focus: ProgramFocusPreset): number {
  if (pool === "conditioning") return 0;
  switch (focus) {
    case "minimal_core":
      if (pool === "core") return 0;
      break;
    case "core_emphasis":
      if (pool === "core") return 4;
      break;
    case "upper_body":
      if (pool === "upper") return 4;
      if (pool === "lower") return 1;
      break;
    case "lower_body":
      if (pool === "lower") return 5;
      if (pool === "upper") return 2;
      break;
    case "conditioning":
      if (pool === "lower") return 3;
      if (pool === "core") return 0;
      break;
    default:
      break;
  }
  return BASE_COOL_QUOTAS[pool];
}

function deriveWarmUp(plan: DayPlan, ctx: StretchResolveContext): StretchEntry[] {
  const recovery = isLightRecoveryDay(plan);
  const cats = categoriesInPlan(plan);
  const focus = ctx.programFocus;
  const daySeed = `d${plan.dayOfWeek}-pf:${focus}`;
  const warmParts: StretchEntry[] = [...ctx.defaultWarmUp];

  const poolIds: StretchThemePoolId[] = [
    "general",
    "upper",
    "lower",
    "core",
    "conditioning",
  ];

  for (const id of poolIds) {
    if (!includeWarmPool(id, plan, cats, focus)) continue;
    let quota = warmUpQuota(id, focus);
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
  const focus = ctx.programFocus;
  const daySeed = `d${plan.dayOfWeek}-pf:${focus}`;
  const coolParts: StretchEntry[] = [...ctx.defaultCoolDown];

  const poolIds: StretchThemePoolId[] = [
    "general",
    "upper",
    "lower",
    "core",
  ];

  for (const id of poolIds) {
    if (!includeWarmPool(id, plan, cats, focus)) continue;
    let quota = coolDownQuota(id, focus);
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
 * from settings defaults, focus, and rounds. Disliked stretches are excluded.
 */
export function resolveStretchesForDay(
  plan: DayPlan,
  ctx: StretchResolveContext,
): {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
} {
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
