import {
  collectDislikedIds,
  collectFavoriteIds,
  getReplacementCandidates,
  pickReplacementCandidate,
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
const UPPER_CATEGORIES = new Set<ExerciseCategory>(["UP", "UPL"]);
const LOWER_BODY_CATEGORIES = new Set<ExerciseCategory>(["LB"]);
const CONDITIONING_CATEGORIES = new Set<ExerciseCategory>(["PC"]);

/** Display order in Settings. */
export const PROGRAM_FOCUS_PRESETS_ORDER: ProgramFocusPreset[] = [
  "balanced",
  "minimal_core",
  "core_emphasis",
  "strength",
  "lower_body",
  "upper_body",
  "conditioning",
];

export type ProgramFocusOption = {
  value: ProgramFocusPreset;
  label: string;
  description: string;
};

export const PROGRAM_FOCUS_OPTIONS: ProgramFocusOption[] = [
  {
    value: "balanced",
    label: "Balanced",
    description:
      "Keeps each day's template mix from the catalog. Use round density below to change how many exercises appear per round.",
  },
  {
    value: "minimal_core",
    label: "Minimal core",
    description:
      "When rounds are shortened, core work (flexion, lower abs, rotation, stability) is dropped first. More room for push, pull, legs, and cardio.",
  },
  {
    value: "core_emphasis",
    label: "Core emphasis",
    description:
      "Keeps core slots longest when trimming and prefers core categories when adding exercises. Good for core strength and stability goals.",
  },
  {
    value: "strength",
    label: "Strength emphasis",
    description:
      "Prioritizes push, pull, and leg strength together when slots are tight or when filling a round.",
  },
  {
    value: "lower_body",
    label: "Lower body emphasis",
    description:
      "Prioritizes leg and glute work (LB) over upper push/pull when adjusting slots. Pair with dislikes to avoid high-impact moves if needed.",
  },
  {
    value: "upper_body",
    label: "Upper body emphasis",
    description:
      "Prioritizes push and pull (UP, UPL) over legs when adjusting slots. Useful when you want less lower-body volume in a round.",
  },
  {
    value: "conditioning",
    label: "Conditioning emphasis",
    description:
      "Prioritizes cardio and plyo (PC) when trimming or filling rounds. Helpful for more metabolic work within each day's template.",
  },
];

/** @deprecated Use {@link PROGRAM_FOCUS_OPTIONS}. */
export const PROGRAM_FOCUS_LABELS: Record<ProgramFocusPreset, string> =
  Object.fromEntries(
    PROGRAM_FOCUS_OPTIONS.map((o) => [o.value, o.label]),
  ) as Record<ProgramFocusPreset, string>;

export type RoundDensityOption = {
  value: RoundDensity;
  label: string;
  description: string;
};

export const ROUND_DENSITY_OPTIONS: RoundDensityOption[] = [
  {
    value: "compact",
    label: "Compact",
    description: "About 3 exercises per round — shorter sessions.",
  },
  {
    value: "standard",
    label: "Standard",
    description: "About 5 exercises per round — matches the default templates.",
  },
  {
    value: "full",
    label: "Full",
    description: "About 7 exercises per round — longer rounds when equipment allows.",
  },
];

/** @deprecated Use {@link ROUND_DENSITY_OPTIONS}. */
export const ROUND_DENSITY_LABELS: Record<RoundDensity, string> =
  Object.fromEntries(
    ROUND_DENSITY_OPTIONS.map((o) => [o.value, o.label]),
  ) as Record<RoundDensity, string>;

function slotKeepPriority(
  category: ExerciseCategory,
  focus: ProgramFocusPreset,
): number {
  switch (focus) {
    case "minimal_core":
      if (CORE_CATEGORIES.has(category)) return 0;
      if (UPPER_CATEGORIES.has(category) || LOWER_BODY_CATEGORIES.has(category))
        return 3;
      if (CONDITIONING_CATEGORIES.has(category)) return 2;
      return 1;
    case "core_emphasis":
      if (CORE_CATEGORIES.has(category)) return 3;
      if (UPPER_CATEGORIES.has(category) || LOWER_BODY_CATEGORIES.has(category))
        return 2;
      if (CONDITIONING_CATEGORIES.has(category)) return 1;
      return 1;
    case "strength":
      if (UPPER_CATEGORIES.has(category) || LOWER_BODY_CATEGORIES.has(category))
        return 3;
      if (CORE_CATEGORIES.has(category)) return 2;
      if (CONDITIONING_CATEGORIES.has(category)) return 1;
      return 1;
    case "lower_body":
      if (LOWER_BODY_CATEGORIES.has(category)) return 3;
      if (CORE_CATEGORIES.has(category)) return 2;
      if (UPPER_CATEGORIES.has(category)) return 1;
      if (CONDITIONING_CATEGORIES.has(category)) return 1;
      return 1;
    case "upper_body":
      if (UPPER_CATEGORIES.has(category)) return 3;
      if (CORE_CATEGORIES.has(category)) return 2;
      if (LOWER_BODY_CATEGORIES.has(category)) return 1;
      if (CONDITIONING_CATEGORIES.has(category)) return 1;
      return 1;
    case "conditioning":
      if (CONDITIONING_CATEGORIES.has(category)) return 3;
      if (UPPER_CATEGORIES.has(category) || LOWER_BODY_CATEGORIES.has(category))
        return 2;
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
  favoriteIds: ReadonlySet<string>,
  seed: string,
): RoundExercise | null {
  const candidates = getReplacementCandidates({
    category,
    excludeExerciseIds: usedInRound,
    availableEquipment,
    dislikedExerciseIds: dislikedIds,
  });
  const pick = pickReplacementCandidate(candidates, favoriteIds, seed);
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
  favoriteIds: ReadonlySet<string>,
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
      favoriteIds,
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
  const favoriteIds = collectFavoriteIds(prefs);

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
        favoriteIds,
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
