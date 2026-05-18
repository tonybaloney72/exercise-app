import { exerciseMap } from "@/data/exercises";
import {
  collectDislikedIds,
  collectFavoriteIds,
  getReplacementCandidates,
  pickReplacementCandidate,
} from "@/lib/exerciseCandidates";
import type { ExercisePreferenceMap, ExerciseSettingsMap } from "@/lib/repos";
import type { TrainingWeekDays } from "@/lib/repos";
import { balancedRoundBudget } from "@/lib/balancedRoundBudget";
import { formatPlanTargetPrescription } from "@/utils/effectiveExerciseSettings";
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
  if (plan.hasJog && !out.includes("PC")) out.push("PC");
  if (out.length === 0) out.push("CS");
  return out;
}

/** Categories a focus preset may pull into a day beyond its template pool. */
function emphasisCategoriesForFocus(focus: ProgramFocusPreset): ExerciseCategory[] {
  switch (focus) {
    case "minimal_core":
      return ["UP", "UPL", "LB", "PC"];
    case "core_emphasis":
      return ["CF", "CL", "CR", "CS"];
    case "strength":
      return ["UP", "UPL", "LB"];
    case "lower_body":
      return ["LB"];
    case "upper_body":
      return ["UP", "UPL"];
    case "conditioning":
      return ["PC"];
    case "balanced":
    default:
      return [];
  }
}

function expandedCategoryPool(
  plan: DayPlan,
  focus: ProgramFocusPreset,
): ExerciseCategory[] {
  const out = dayCategoryPool(plan);
  for (const c of emphasisCategoriesForFocus(focus)) {
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

/** Swap low-priority template categories for emphasis categories at the same slot count. */
function rebalanceCategoriesForFocus(
  categories: ExerciseCategory[],
  plan: DayPlan,
  focus: ProgramFocusPreset,
): ExerciseCategory[] {
  if (focus === "balanced" || categories.length === 0) return categories;

  const pool = expandedCategoryPool(plan, focus);
  const out = [...categories];

  for (let swap = 0; swap < out.length; swap++) {
    let weakestIdx = -1;
    let weakestScore = Infinity;
    for (let i = 0; i < out.length; i++) {
      const score = slotKeepPriority(out[i]!, focus);
      if (score < weakestScore) {
        weakestScore = score;
        weakestIdx = i;
      }
    }
    if (weakestIdx < 0 || weakestScore >= 3) break;

    const counts = new Map<ExerciseCategory, number>();
    for (const c of out) counts.set(c, (counts.get(c) ?? 0) + 1);

    let replacement: ExerciseCategory | null = null;
    let replacementScore = -1;
    for (const candidate of pool) {
      const score = slotKeepPriority(candidate, focus);
      if (score <= weakestScore) continue;
      const count = counts.get(candidate) ?? 0;
      const repCount = replacement ? (counts.get(replacement) ?? 0) : Infinity;
      if (
        score > replacementScore ||
        (score === replacementScore && count < repCount)
      ) {
        replacement = candidate;
        replacementScore = score;
      }
    }

    if (!replacement) break;
    out[weakestIdx] = replacement;
  }

  return out;
}

function pickCategoryToAdd(
  current: RoundExercise[],
  plan: DayPlan,
  focus: ProgramFocusPreset,
  roundNumber: number,
): ExerciseCategory | null {
  const pool = expandedCategoryPool(plan, focus);
  const roundOffset = (roundNumber - 1) % Math.max(1, pool.length);
  const rotated = [...pool.slice(roundOffset), ...pool.slice(0, roundOffset)];
  const counts = new Map<ExerciseCategory, number>();
  for (const s of current) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }

  const ranked = [...rotated].sort((a, b) => {
    const pa = slotKeepPriority(a, focus);
    const pb = slotKeepPriority(b, focus);
    if (pb !== pa) return pb - pa;
    const ca = counts.get(a) ?? 0;
    const cb = counts.get(b) ?? 0;
    if (ca !== cb) return ca - cb;
    return rotated.indexOf(a) - rotated.indexOf(b);
  });

  return ranked[0] ?? null;
}

function fillSlot(
  category: ExerciseCategory,
  usedInRound: Set<string>,
  usedInDay: ReadonlySet<string>,
  availableEquipment: ExerciseEquipment[],
  dislikedIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  seed: string,
  exerciseSettings?: ExerciseSettingsMap,
): RoundExercise | null {
  const exclude = new Set<string>([...usedInRound, ...usedInDay]);
  const candidates = getReplacementCandidates({
    category,
    excludeExerciseIds: exclude,
    availableEquipment,
    dislikedExerciseIds: dislikedIds,
  });
  const pick = pickReplacementCandidate(candidates, favoriteIds, seed);
  if (!pick) return null;

  const meta = exerciseMap[pick.id];
  const targetReps = meta
    ? formatPlanTargetPrescription(meta, exerciseSettings?.[pick.id])
    : pick.defaultReps;

  return {
    exerciseId: pick.id,
    category,
    targetReps,
  };
}

function stubSlots(categories: ExerciseCategory[]): RoundExercise[] {
  return categories.map((category, index) => ({
    exerciseId: `__stub-${index}`,
    category,
    targetReps: "1",
  }));
}

function roundCategoriesForFocus(
  plan: DayPlan,
  roundNumber: number,
  focus: ProgramFocusPreset,
  target: number,
): ExerciseCategory[] {
  if (focus === "balanced") {
    return balancedRoundBudget(plan, roundNumber, target);
  }
  return buildRoundCategoriesFromDayBudget(plan, roundNumber, focus, target);
}

/** Category slots for a round from day theme + focus (not catalog exercise ids). */
function buildRoundCategoriesFromDayBudget(
  plan: DayPlan,
  roundNumber: number,
  focus: ProgramFocusPreset,
  target: number,
): ExerciseCategory[] {
  let categories: ExerciseCategory[] = [];
  let stubs: RoundExercise[] = [];

  let guard = 0;
  while (categories.length < target && guard < 12) {
    guard += 1;
    const category = pickCategoryToAdd(stubs, plan, focus, roundNumber);
    if (!category) break;
    categories.push(category);
    stubs = stubSlots(categories);
  }

  return rebalanceCategoriesForFocus(categories, plan, focus);
}

/** Pick fresh exercises per slot; catalog ids are not carried through. */
function rebuildRound(
  roundNumber: number,
  plan: DayPlan,
  focus: ProgramFocusPreset,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  dislikedIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  usedInDay: Set<string>,
  exerciseSettings?: ExerciseSettingsMap,
  varietySeed?: string,
): RoundExercise[] {
  const target = Math.max(2, Math.min(8, ROUND_DENSITY_TARGETS[density]));
  const categories = roundCategoriesForFocus(
    plan,
    roundNumber,
    focus,
    target,
  );
  const usedInRound = new Set<string>();
  const rebuilt: RoundExercise[] = [];
  const variety = varietySeed?.trim() ? varietySeed.trim() : "static";

  for (let i = 0; i < categories.length; i++) {
    const filled = fillSlot(
      categories[i]!,
      usedInRound,
      usedInDay,
      availableEquipment,
      dislikedIds,
      favoriteIds,
      `d${plan.dayOfWeek}-r${roundNumber}-i${i}-pf:${focus}-v:${variety}-u:${usedInDay.size}`,
      exerciseSettings,
    );
    if (!filled) continue;
    rebuilt.push(filled);
    usedInRound.add(filled.exerciseId);
    usedInDay.add(filled.exerciseId);
  }

  return rebuilt;
}

/** Rule-based materialization from catalog template (focus + density). */
export function applyProgramProfileToDayPlan(
  plan: DayPlan,
  focus: ProgramFocusPreset,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  prefs: ExercisePreferenceMap,
  exerciseSettings?: ExerciseSettingsMap,
  varietySeed?: string,
): DayPlan {
  const dislikedIds = collectDislikedIds(prefs);
  const favoriteIds = collectFavoriteIds(prefs);
  const usedInDay = new Set<string>();

  return {
    ...plan,
    rounds: plan.rounds.map((round) => ({
      ...round,
      exercises: rebuildRound(
        round.roundNumber,
        plan,
        focus,
        density,
        availableEquipment,
        dislikedIds,
        favoriteIds,
        usedInDay,
        exerciseSettings,
        varietySeed,
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
  exerciseSettings?: ExerciseSettingsMap,
  varietySeed?: string,
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
      exerciseSettings,
      varietySeed,
    );
  }
  return out;
}
