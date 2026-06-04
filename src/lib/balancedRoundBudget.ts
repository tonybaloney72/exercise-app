import { dayPlanCategoryPool } from "@/lib/dayPlanCategoryPool";
import type { DayPlan, ExerciseCategory } from "@/types";

const FULL_BUDGET_SLOTS = 7;

function isRecoveryDay(plan: DayPlan): boolean {
  return (
    plan.strengthFocus.length === 0 &&
    plan.coreGroups.length === 1 &&
    plan.coreGroups[0] === "CS"
  );
}

function dayPool(plan: DayPlan): ExerciseCategory[] {
  return dayPlanCategoryPool(plan);
}

/** Full (7-slot) balanced recipe before density trim. */
export function buildBalancedFullBudget(
  plan: DayPlan,
  roundNumber: number,
): ExerciseCategory[] {
  if (isRecoveryDay(plan)) {
    return Array.from({ length: FULL_BUDGET_SLOTS }, () => "CS");
  }

  const strength = [...plan.strengthFocus];
  const core = [...plan.coreGroups];
  const pcInStrength = strength.includes("PC");
  const out: ExerciseCategory[] = [];

  if (strength.length === 1) {
    const s = strength[0]!;
    out.push(s);
    if (roundNumber === 1) out.push(s);
  } else if (strength.length > 1) {
    for (const s of strength) out.push(s);
    out.push(strength[(roundNumber - 1) % strength.length]!);
  }

  for (let i = 0; i < core.length; i++) {
    out.push(core[i]!);
    if (strength.length === 1 && roundNumber === 2 && i === 0) {
      out.push(core[0]!);
    }
    if (strength.length === 1 && roundNumber === 3 && i === 1) {
      out.push(core[1]!);
    }
  }

  const withPc = plan.hasJog && !pcInStrength;
  let slotsBeforeExtras = out.length + (withPc ? 1 : 0);
  if (plan.hasJog && pcInStrength) slotsBeforeExtras += 1;
  const coreExtras = Math.max(0, FULL_BUDGET_SLOTS - slotsBeforeExtras);

  for (let i = 0; i < coreExtras && core.length > 0; i++) {
    out.push(core[(roundNumber - 1 + i) % core.length]!);
  }

  if (withPc) out.push("PC");
  if (plan.hasJog && pcInStrength && out.length < FULL_BUDGET_SLOTS) {
    out.push("PC");
  }

  while (out.length < FULL_BUDGET_SLOTS && strength.length === 1) {
    out.push(strength[0]!);
  }

  return out.slice(0, FULL_BUDGET_SLOTS);
}

function minCountForCategory(
  cat: ExerciseCategory,
  plan: DayPlan,
  target: number,
): number {
  const pool = dayPool(plan);
  if (isRecoveryDay(plan)) return target > 0 ? 1 : 0;

  if (target >= pool.length && pool.includes(cat)) return 1;

  if (target === 3 && plan.hasJog) {
    if (cat === "PC") return 1;
    if (plan.strengthFocus.includes(cat)) return 1;
    if (plan.coreGroups[0] === cat) return 1;
  }

  return 0;
}

function removableScore(
  budget: ExerciseCategory[],
  index: number,
  plan: DayPlan,
  target: number,
): number {
  const cat = budget[index]!;
  const count = budget.filter((c) => c === cat).length;
  const min = minCountForCategory(cat, plan, target);
  if (count <= min) return -1;

  let score = 50;
  if (count > 1) score += 40;
  if (cat === "PC") score += 5;
  if (plan.coreGroups.includes(cat)) score += 10;
  if (plan.strengthFocus.includes(cat)) score += 8;
  score += index * 0.01;
  return score;
}

/** Trim a full balanced budget to compact / standard / full density. */
export function trimBalancedBudget(
  full: ExerciseCategory[],
  target: number,
  plan: DayPlan,
): ExerciseCategory[] {
  if (full.length <= target) return [...full];
  const out = [...full];

  while (out.length > target) {
    let bestIdx = -1;
    let bestScore = -1;
    for (let i = 0; i < out.length; i++) {
      const score = removableScore(out, i, plan, target);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) {
      out.pop();
    } else {
      out.splice(bestIdx, 1);
    }
  }

  return out;
}

/** Category slots for one round when program focus is `balanced`. */
export function balancedRoundBudget(
  plan: DayPlan,
  roundNumber: number,
  targetSlots: number,
): ExerciseCategory[] {
  const target = Math.max(2, Math.min(8, targetSlots));
  const full = buildBalancedFullBudget(plan, roundNumber);
  return trimBalancedBudget(full, target, plan);
}
