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
  RoundDensity,
  RoundExercise,
  TrainingPriorityPreset,
} from "@/types";
import {
  categoryPriorityScore,
  extraCategoriesForProfile,
  isBalancedProfile,
  scoresFromPreset,
  weightsFromScores,
  type TrainingPriorityScores,
  type TrainingPriorityWeights,
} from "@/lib/trainingPriorities";

export type ProgramProfileInput = {
  preset: TrainingPriorityPreset;
  scores: TrainingPriorityScores;
  customized: boolean;
};

export function buildProgramProfileInput(
  preset: TrainingPriorityPreset,
  scores?: TrainingPriorityScores,
  customized = false,
): ProgramProfileInput {
  const resolved = scores ?? scoresFromPreset(preset);
  return {
    preset,
    scores: resolved,
    customized,
  };
}

export const ROUND_DENSITY_TARGETS: Record<RoundDensity, number> = {
  compact: 3,
  standard: 5,
  full: 7,
};

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

function expandedCategoryPool(
  plan: DayPlan,
  profile: ProgramProfileInput,
): ExerciseCategory[] {
  const out = dayCategoryPool(plan);
  for (const c of extraCategoriesForProfile(
    profile.preset,
    profile.scores,
    profile.customized,
  )) {
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

function pickCategoryToAdd(
  current: RoundExercise[],
  plan: DayPlan,
  profile: ProgramProfileInput,
  weights: TrainingPriorityWeights,
  roundNumber: number,
): ExerciseCategory | null {
  const pool = expandedCategoryPool(plan, profile).filter(
    (cat) => categoryPriorityScore(cat, weights) > 0,
  );
  if (pool.length === 0) return null;
  const roundOffset = (roundNumber - 1) % Math.max(1, pool.length);
  const rotated = [...pool.slice(roundOffset), ...pool.slice(0, roundOffset)];
  const counts = new Map<ExerciseCategory, number>();
  for (const s of current) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }

  const ranked = [...rotated].sort((a, b) => {
    const ca = counts.get(a) ?? 0;
    const cb = counts.get(b) ?? 0;
    if (ca !== cb) return ca - cb;
    const pa = categoryPriorityScore(a, weights);
    const pb = categoryPriorityScore(b, weights);
    if (pb !== pa) return pb - pa;
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

function roundCategoriesForProfile(
  plan: DayPlan,
  roundNumber: number,
  profile: ProgramProfileInput,
  target: number,
  weights: TrainingPriorityWeights,
): ExerciseCategory[] {
  if (isBalancedProfile(profile.scores, profile.customized)) {
    return balancedRoundBudget(plan, roundNumber, target);
  }
  return buildRoundCategoriesFromDayBudget(
    plan,
    roundNumber,
    profile,
    weights,
    target,
  );
}

/** Category slots for a round from day theme + priority weights (not catalog exercise ids). */
function buildRoundCategoriesFromDayBudget(
  plan: DayPlan,
  roundNumber: number,
  profile: ProgramProfileInput,
  weights: TrainingPriorityWeights,
  target: number,
): ExerciseCategory[] {
  let categories: ExerciseCategory[] = [];
  let stubs: RoundExercise[] = [];

  let guard = 0;
  while (categories.length < target && guard < 12) {
    guard += 1;
    const category = pickCategoryToAdd(
      stubs,
      plan,
      profile,
      weights,
      roundNumber,
    );
    if (!category) break;
    categories.push(category);
    stubs = stubSlots(categories);
  }

  return categories;
}

/** Pick fresh exercises per slot; catalog ids are not carried through. */
function rebuildRound(
  roundNumber: number,
  plan: DayPlan,
  profile: ProgramProfileInput,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  dislikedIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  usedInDay: Set<string>,
  exerciseSettings?: ExerciseSettingsMap,
  varietySeed?: string,
): RoundExercise[] {
  const weights = weightsFromScores(profile.scores);
  const target = Math.max(2, Math.min(8, ROUND_DENSITY_TARGETS[density]));
  const categories = roundCategoriesForProfile(
    plan,
    roundNumber,
    profile,
    target,
    weights,
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
      `d${plan.dayOfWeek}-r${roundNumber}-i${i}-tp:${profile.preset}-v:${variety}-u:${usedInDay.size}`,
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
  preset: TrainingPriorityPreset,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  prefs: ExercisePreferenceMap,
  exerciseSettings?: ExerciseSettingsMap,
  varietySeed?: string,
  profileInput?: ProgramProfileInput,
): DayPlan {
  const profile = profileInput ?? buildProgramProfileInput(preset);
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
        profile,
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
  preset: TrainingPriorityPreset,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  prefs: ExercisePreferenceMap,
  exerciseSettings?: ExerciseSettingsMap,
  varietySeed?: string,
  profileInput?: ProgramProfileInput,
): TrainingWeekDays {
  const profile = profileInput ?? buildProgramProfileInput(preset);
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    const day = week[i];
    if (!day) continue;
    out[i] = applyProgramProfileToDayPlan(
      day,
      preset,
      density,
      availableEquipment,
      prefs,
      exerciseSettings,
      varietySeed,
      profile,
    );
  }
  return out;
}
