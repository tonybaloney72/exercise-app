import type { DayPlan, ExerciseCategory, StretchEntry } from "@/types";

/** Stretch pools keyed by training focus (see `DayPlan.strengthFocus` / `coreGroups`). */
const WARM_UP_POOLS = {
  universal: [
    { exerciseId: "SW-1", targetReps: "10 each direction" },
    { exerciseId: "SW-2", targetReps: "10 each direction" },
    { exerciseId: "SW-7", targetReps: "10" },
    { exerciseId: "SW-5", targetReps: "10 each side" },
  ] satisfies StretchEntry[],
  upper: [
    { exerciseId: "SW-3", targetReps: "10 each side" },
    { exerciseId: "SW-31", targetReps: "10" },
  ] satisfies StretchEntry[],
  lower: [
    { exerciseId: "SW-14", targetReps: "10 each direction" },
    { exerciseId: "SW-12", targetReps: "10 each leg" },
    { exerciseId: "SW-11", targetReps: "8 each leg" },
    { exerciseId: "SW-15", targetReps: "10" },
    { exerciseId: "SW-16", targetReps: "5 each side" },
  ] satisfies StretchEntry[],
  core: [
    { exerciseId: "SW-8", targetReps: "8 each side" },
  ] satisfies StretchEntry[],
  conditioning: [
    { exerciseId: "SW-33", targetReps: "20" },
    { exerciseId: "SW-34", targetReps: "10 each side" },
  ] satisfies StretchEntry[],
} as const;

const COOL_DOWN_POOLS = {
  universal: [
    { exerciseId: "SC-2", targetReps: "30 sec" },
    { exerciseId: "SC-3", targetReps: "20 sec each side" },
  ] satisfies StretchEntry[],
  upper: [
    { exerciseId: "SC-5", targetReps: "20–30 sec" },
    { exerciseId: "SC-6", targetReps: "20 sec each arm" },
    { exerciseId: "SC-7", targetReps: "20 sec each arm" },
    { exerciseId: "SC-8", targetReps: "20–30 sec each side" },
  ] satisfies StretchEntry[],
  lower: [
    { exerciseId: "SC-9", targetReps: "20–30 sec each leg" },
    { exerciseId: "SC-10", targetReps: "20–30 sec each leg" },
    { exerciseId: "SC-12", targetReps: "20–30 sec each leg" },
    { exerciseId: "SC-14", targetReps: "20–30 sec" },
  ] satisfies StretchEntry[],
  core: [
    { exerciseId: "SC-1", targetReps: "20–30 sec" },
    { exerciseId: "SC-4", targetReps: "20–30 sec" },
  ] satisfies StretchEntry[],
} as const;

const UPPER_STRENGTH: ExerciseCategory[] = ["UP", "UPL"];
const LOWER_STRENGTH: ExerciseCategory[] = ["LB"];
const CORE_GROUPS: ExerciseCategory[] = ["CF", "CL", "CR", "CS"];

function dedupeStretches(entries: StretchEntry[]): StretchEntry[] {
  const seen = new Set<string>();
  const out: StretchEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.exerciseId)) continue;
    seen.add(entry.exerciseId);
    out.push(entry);
  }
  return out;
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

function dayWantsUpper(plan: DayPlan, cats: Set<ExerciseCategory>): boolean {
  return plan.strengthFocus.some((c) => UPPER_STRENGTH.includes(c)) || cats.has("UP") || cats.has("UPL");
}

function dayWantsLower(plan: DayPlan, cats: Set<ExerciseCategory>): boolean {
  return (
    plan.hasJog ||
    plan.strengthFocus.some((c) => LOWER_STRENGTH.includes(c) || c === "CP") ||
    cats.has("LB") ||
    cats.has("CP")
  );
}

function dayWantsCore(plan: DayPlan, cats: Set<ExerciseCategory>): boolean {
  return (
    plan.coreGroups.length > 0 ||
    CORE_GROUPS.some((c) => cats.has(c))
  );
}

function dayWantsConditioning(plan: DayPlan, cats: Set<ExerciseCategory>): boolean {
  return plan.strengthFocus.includes("CP") || cats.has("CP");
}

/**
 * Warm-up / cool-down for a prescribed day from stable `DayPlan` focus metadata
 * (strength focus, core groups, jog flag, and round categories).
 */
export function resolveStretchesForDay(plan: DayPlan): {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
} {
  const recovery = isLightRecoveryDay(plan);
  const cats = categoriesInPlan(plan);

  const warmParts: StretchEntry[] = [...WARM_UP_POOLS.universal];
  if (dayWantsUpper(plan, cats)) warmParts.push(...WARM_UP_POOLS.upper);
  if (dayWantsLower(plan, cats)) warmParts.push(...WARM_UP_POOLS.lower);
  if (dayWantsCore(plan, cats)) warmParts.push(...WARM_UP_POOLS.core);
  if (dayWantsConditioning(plan, cats)) warmParts.push(...WARM_UP_POOLS.conditioning);

  const coolParts: StretchEntry[] = [...COOL_DOWN_POOLS.universal];
  if (dayWantsUpper(plan, cats)) coolParts.push(...COOL_DOWN_POOLS.upper);
  if (dayWantsLower(plan, cats)) coolParts.push(...COOL_DOWN_POOLS.lower);
  if (dayWantsCore(plan, cats)) coolParts.push(...COOL_DOWN_POOLS.core);

  const warmCap = recovery ? 6 : 10;
  const coolCap = recovery ? 6 : 10;

  return {
    warmUp: dedupeStretches(warmParts).slice(0, warmCap),
    coolDown: dedupeStretches(coolParts).slice(0, coolCap),
  };
}
