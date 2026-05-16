import {
  collectDislikedIds,
  getReplacementCandidates,
} from "@/lib/exerciseCandidates";
import type { ExercisePreferenceMap } from "@/lib/repos";
import type { TrainingWeekDays } from "@/lib/repos";
import type {
  DayPlan,
  ExerciseCategory,
  ExerciseEquipment,
  ProgramFocusPreset,
  RoundDensity,
  RoundExercise,
} from "@/types";

export const ROUND_DENSITY_TARGETS: Record<RoundDensity, number> = {
  compact: 3,
  standard: 5,
  full: 7,
};

const CORE_CATEGORIES = new Set<ExerciseCategory>(["CF", "CL", "CR", "CS"]);
const STRENGTH_CATEGORIES = new Set<ExerciseCategory>(["UP", "UPL", "LB"]);
const CONDITIONING_CATEGORIES = new Set<ExerciseCategory>(["CP"]);

export const PROGRAM_FOCUS_LABELS: Record<ProgramFocusPreset, string> = {
  balanced: "Balanced",
  minimal_core: "Minimal core",
  strength: "Strength emphasis",
  conditioning: "Conditioning emphasis",
};

export const ROUND_DENSITY_LABELS: Record<RoundDensity, string> = {
  compact: "Compact (~3 / round)",
  standard: "Standard (~5 / round)",
  full: "Full (~7 / round)",
};

function slotKeepPriority(
  category: ExerciseCategory,
  focus: ProgramFocusPreset,
): number {
  switch (focus) {
    case "minimal_core":
      if (CORE_CATEGORIES.has(category)) return 0;
      if (STRENGTH_CATEGORIES.has(category)) return 3;
      if (CONDITIONING_CATEGORIES.has(category)) return 2;
      return 1;
    case "strength":
      if (STRENGTH_CATEGORIES.has(category)) return 3;
      if (CORE_CATEGORIES.has(category)) return 2;
      if (CONDITIONING_CATEGORIES.has(category)) return 1;
      return 1;
    case "conditioning":
      if (CONDITIONING_CATEGORIES.has(category)) return 3;
      if (STRENGTH_CATEGORIES.has(category)) return 2;
      if (CORE_CATEGORIES.has(category)) return 1;
      return 1;
    case "balanced":
    default:
      return 2;
  }
}

function dayCategoryPool(plan: DayPlan): ExerciseCategory[] {
  const out: ExerciseCategory[] = [];
  for (const c of plan.strengthFocus) {
    if (!out.includes(c)) out.push(c);
  }
  for (const c of plan.coreGroups) {
    if (!out.includes(c)) out.push(c);
  }
  if (out.length === 0) out.push("CS");
  return out;
}

function pickCategoryToAdd(
  current: RoundExercise[],
  plan: DayPlan,
  focus: ProgramFocusPreset,
): ExerciseCategory | null {
  const pool = dayCategoryPool(plan);
  const counts = new Map<ExerciseCategory, number>();
  for (const s of current) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }

  const ranked = [...pool].sort((a, b) => {
    const pa = slotKeepPriority(a, focus);
    const pb = slotKeepPriority(b, focus);
    if (pb !== pa) return pb - pa;
    return (counts.get(a) ?? 0) - (counts.get(b) ?? 0);
  });

  return ranked[0] ?? null;
}

function fillSlot(
  category: ExerciseCategory,
  usedInRound: Set<string>,
  availableEquipment: ExerciseEquipment[],
  dislikedIds: ReadonlySet<string>,
  seed: string,
): RoundExercise | null {
  const candidates = getReplacementCandidates({
    category,
    excludeExerciseIds: usedInRound,
    availableEquipment,
    dislikedExerciseIds: dislikedIds,
  });
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => {
    const keyA = `${seed}:${a.id}`;
    const keyB = `${seed}:${b.id}`;
    return keyA.localeCompare(keyB);
  });
  const pick = sorted[0] ?? null;
  if (!pick) return null;

  return {
    exerciseId: pick.id,
    category,
    targetReps: pick.defaultReps,
  };
}

function reshapeRound(
  roundNumber: number,
  exercises: RoundExercise[],
  plan: DayPlan,
  focus: ProgramFocusPreset,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  dislikedIds: ReadonlySet<string>,
): RoundExercise[] {
  const target = Math.max(2, Math.min(8, ROUND_DENSITY_TARGETS[density]));

  const scored = exercises.map((slot, index) => ({
    slot,
    index,
    priority: slotKeepPriority(slot.category, focus),
  }));
  scored.sort((a, b) => b.priority - a.priority || a.index - b.index);

  let kept = scored.slice(0, Math.min(target, scored.length)).map((x) => ({ ...x.slot }));
  const usedInRound = new Set(kept.map((s) => s.exerciseId));

  let guard = 0;
  while (kept.length < target && guard < 12) {
    guard += 1;
    const category = pickCategoryToAdd(kept, plan, focus);
    if (!category) break;
    const filled = fillSlot(
      category,
      usedInRound,
      availableEquipment,
      dislikedIds,
      `d${plan.dayOfWeek}-r${roundNumber}-s${kept.length}`,
    );
    if (!filled) break;
    kept.push(filled);
    usedInRound.add(filled.exerciseId);
  }

  return kept;
}

/** Rule-based reshape from catalog template (focus + density). */
export function applyProgramProfileToDayPlan(
  plan: DayPlan,
  focus: ProgramFocusPreset,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  prefs: ExercisePreferenceMap,
): DayPlan {
  if (focus === "balanced" && density === "standard") {
    return plan;
  }

  const dislikedIds = collectDislikedIds(prefs);

  return {
    ...plan,
    rounds: plan.rounds.map((round) => ({
      ...round,
      exercises: reshapeRound(
        round.roundNumber,
        round.exercises,
        plan,
        focus,
        density,
        availableEquipment,
        dislikedIds,
      ),
    })),
  };
}

export function applyProgramProfileToWeek(
  week: TrainingWeekDays,
  focus: ProgramFocusPreset,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  prefs: ExercisePreferenceMap,
): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    const day = week[i];
    if (!day) continue;
    out[i] = applyProgramProfileToDayPlan(
      day,
      focus,
      density,
      availableEquipment,
      prefs,
    );
  }
  return out;
}
