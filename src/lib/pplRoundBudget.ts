import { trimBalancedBudget } from "@/lib/balancedRoundBudget";
import type { DayPlan, ExerciseCategory } from "@/types";

const FULL_BUDGET_SLOTS = 7;

/** Active recovery shape (rest editor or post-apply template). */
function isPplRecoveryDay(plan: DayPlan): boolean {
  if (plan.restDayMode === "active_recovery") return true;
  return (
    plan.strengthFocus.length === 0 &&
    plan.coreGroups.length === 1 &&
    plan.coreGroups[0] === "CS"
  );
}

/** Full (7-slot) PPL recipe before density trim. No PC in strength rounds (cardio = finisher block). */
export function buildPplFullBudget(
  plan: DayPlan,
  roundNumber: number,
): ExerciseCategory[] {
  if (isPplRecoveryDay(plan)) {
    return Array.from({ length: FULL_BUDGET_SLOTS }, () => "CS");
  }

  const strength = [...plan.strengthFocus];
  const core = [...plan.coreGroups];

  if (strength.length === 0 && core.length > 0) {
    const out: ExerciseCategory[] = [];
    for (const c of core) out.push(c);
    while (out.length < FULL_BUDGET_SLOTS) {
      out.push(core[(roundNumber - 1 + out.length) % core.length]!);
    }
    return out.slice(0, FULL_BUDGET_SLOTS);
  }

  if (strength.includes("LB")) {
    const out: ExerciseCategory[] = ["LB", "LB"];
    for (const c of core) out.push(c);
    let pad = 0;
    while (out.length < FULL_BUDGET_SLOTS) {
      out.push(pad % 2 === 0 ? "LB" : core[pad % Math.max(1, core.length)]!);
      pad += 1;
    }
    return out.slice(0, FULL_BUDGET_SLOTS);
  }

  if (strength.length === 1) {
    const s = strength[0]!;
    const out: ExerciseCategory[] = [];
    while (out.length < FULL_BUDGET_SLOTS) out.push(s);
    return out.slice(0, FULL_BUDGET_SLOTS);
  }

  return [];
}

/** Category slots for one round in Preset (PPL) mode. */
export function pplRoundBudget(
  plan: DayPlan,
  roundNumber: number,
  targetSlots: number,
): ExerciseCategory[] {
  const target = Math.max(2, Math.min(8, targetSlots));
  const full = buildPplFullBudget(plan, roundNumber);
  return trimBalancedBudget(full, target, plan);
}
