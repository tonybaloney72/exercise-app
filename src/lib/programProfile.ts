import { exerciseMap } from "@/data/exercises";
import {
  collectDislikedIds,
  collectFavoriteIds,
  getReplacementCandidates,
  pickReplacementCandidate,
  type ExpertiseFilter,
} from "@/lib/exerciseCandidates";
import { resolveExpertiseFilter } from "@/lib/expertiseLevels";
import type { ExercisePreferenceMap, ExerciseSettingsMap } from "@/lib/repos";
import type { TrainingWeekDays } from "@/lib/repos";
import { balancedRoundBudget } from "@/lib/balancedRoundBudget";
import { dayPlanCategoryPool } from "@/lib/dayPlanCategoryPool";
import { materializeLayoutDayPlan } from "@/lib/layoutDayMaterializer";
import { materializePplDayPlan } from "@/lib/pplDayMaterializer";
import { formatPlanTargetPrescription } from "@/utils/effectiveExerciseSettings";
import type {
  DayPlan,
  ExerciseCategory,
  ExerciseEquipment,
  RoundDensity,
  RoundExercise,
  TrainingPriorityPreset,
  UserSettings,
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
import {
  categoriesForDayLayout,
  layoutGroupForCategory,
  layoutGroupsForDay,
  type LayoutGroup,
  type WeeklyCategoryLayout,
  LAYOUT_GROUP_TO_CATEGORY,
} from "@/lib/weeklyCategoryLayout";
import type { WeeklyLayoutDayStructure } from "@/lib/weeklyLayoutDayStructure";
import { materializeBlueprintDayPlanFromSettings } from "@/lib/blueprintDayMaterializer";
import type { WeekBlueprint } from "@/lib/weekBlueprint";
import { isGuidedCustomSettings } from "@/lib/weekBlueprintPolicy";

export type ProgramProfileInput = {
  preset: TrainingPriorityPreset;
  scores: TrainingPriorityScores;
  customized: boolean;
  /** Layout mode: per-day group allowlist, equal fill weights, no preset extras. */
  layoutMode?: boolean;
  weeklyCategoryLayout?: WeeklyCategoryLayout;
  weeklyLayoutDayStructure?: WeeklyLayoutDayStructure;
  /** Custom week mode: keep day shells; do not auto-fill strength exercises. */
  customMode?: boolean;
  /** Preset mode: PPL day pools + round budgets; no cross-day category injection. */
  pplMode?: boolean;
  /** Guided custom: week blueprint drives per-round materialization. */
  blueprintMode?: boolean;
  weekBlueprint?: WeekBlueprint;
};

export function buildProgramProfileInput(
  preset: TrainingPriorityPreset,
  scores?: TrainingPriorityScores,
  customized = false,
  options?: {
    layoutMode?: boolean;
    weeklyCategoryLayout?: WeeklyCategoryLayout;
    weeklyLayoutDayStructure?: WeeklyLayoutDayStructure;
    customMode?: boolean;
    pplMode?: boolean;
    blueprintMode?: boolean;
    weekBlueprint?: WeekBlueprint;
  },
): ProgramProfileInput {
  const resolved = scores ?? scoresFromPreset(preset);
  return {
    preset,
    scores: resolved,
    customized,
    layoutMode: options?.layoutMode,
    weeklyCategoryLayout: options?.weeklyCategoryLayout,
    weeklyLayoutDayStructure: options?.weeklyLayoutDayStructure,
    customMode: options?.customMode,
    pplMode: options?.pplMode,
    blueprintMode: options?.blueprintMode,
    weekBlueprint: options?.weekBlueprint,
  };
}

export function buildProgramProfileInputFromSettings(
  settings: UserSettings,
): ProgramProfileInput {
  if (isGuidedCustomSettings(settings)) {
    return buildProgramProfileInput(
      "balanced",
      scoresFromPreset("balanced"),
      false,
      {
        blueprintMode: true,
        weekBlueprint: settings.weekBlueprint,
      },
    );
  }
  if (settings.programMode === "custom") {
    return buildProgramProfileInput(
      "balanced",
      scoresFromPreset("balanced"),
      false,
      {
        customMode: true,
      },
    );
  }
  const preset = settings.trainingPriorityPreset ?? "balanced";
  return buildProgramProfileInput(
    preset,
    settings.trainingPriorityScores,
    settings.trainingPriorityCustomized ?? false,
    { pplMode: true },
  );
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
    description:
      "About 7 exercises per round — longer rounds when equipment allows.",
  },
];

/** @deprecated Use {@link ROUND_DENSITY_OPTIONS}. */
const ROUND_DENSITY_LABELS: Record<RoundDensity, string> = Object.fromEntries(
  ROUND_DENSITY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<RoundDensity, string>;

function catalogDayCategoryPool(plan: DayPlan): ExerciseCategory[] {
  return dayPlanCategoryPool(plan);
}

/** PPL preset pools: day theme only; cardio finisher is not a strength-round PC slot. */
function pplDayCategoryPool(plan: DayPlan): ExerciseCategory[] {
  return dayPlanCategoryPool(plan, { includePcWhenJog: false });
}

function isPplProgramProfile(profile: ProgramProfileInput): boolean {
  return (
    profile.pplMode === true &&
    !profile.layoutMode &&
    !profile.customMode &&
    !profile.blueprintMode
  );
}

function dayCategoryPool(
  plan: DayPlan,
  profile: ProgramProfileInput,
): ExerciseCategory[] {
  if (profile.layoutMode && profile.weeklyCategoryLayout) {
    const groups = profile.weeklyCategoryLayout[plan.dayOfWeek] ?? [];
    return categoriesForDayLayout(plan, groups);
  }
  if (isPplProgramProfile(profile)) {
    return pplDayCategoryPool(plan);
  }
  return catalogDayCategoryPool(plan);
}

function expandedCategoryPool(
  plan: DayPlan,
  profile: ProgramProfileInput,
): ExerciseCategory[] {
  const out = dayCategoryPool(plan, profile);
  if (profile.layoutMode || isPplProgramProfile(profile)) return out;
  for (const c of extraCategoriesForProfile(
    profile.preset,
    profile.scores,
    profile.customized,
  )) {
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

function layoutGroupsForProfileDay(
  plan: DayPlan,
  profile: ProgramProfileInput,
): LayoutGroup[] {
  if (!profile.layoutMode || !profile.weeklyCategoryLayout) return [];
  const groups = profile.weeklyCategoryLayout[plan.dayOfWeek] ?? [];
  return layoutGroupsForDay(plan, groups);
}

function pickCategoryToAddForLayout(
  current: RoundExercise[],
  plan: DayPlan,
  profile: ProgramProfileInput,
  pool: ExerciseCategory[],
  roundNumber: number,
): ExerciseCategory | null {
  const enabledGroups = layoutGroupsForProfileDay(plan, profile);
  if (enabledGroups.length === 0 || pool.length === 0) return null;

  const groupCounts = new Map<LayoutGroup, number>();
  for (const s of current) {
    const lg = layoutGroupForCategory(s.category);
    if (lg) groupCounts.set(lg, (groupCounts.get(lg) ?? 0) + 1);
  }

  const roundOffset = (roundNumber - 1) % enabledGroups.length;
  const rotatedGroups = [
    ...enabledGroups.slice(roundOffset),
    ...enabledGroups.slice(0, roundOffset),
  ];
  const rankedGroups = [...rotatedGroups].sort((a, b) => {
    const ca = groupCounts.get(a) ?? 0;
    const cb = groupCounts.get(b) ?? 0;
    if (ca !== cb) return ca - cb;
    return rotatedGroups.indexOf(a) - rotatedGroups.indexOf(b);
  });

  for (const group of rankedGroups) {
    const cat = LAYOUT_GROUP_TO_CATEGORY[group];
    if (pool.includes(cat)) return cat;
  }
  return pool[0] ?? null;
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

  if (profile.layoutMode) {
    return pickCategoryToAddForLayout(
      current,
      plan,
      profile,
      pool,
      roundNumber,
    );
  }

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
  expertiseFilter?: ExpertiseFilter | null,
): RoundExercise | null {
  const exclude = new Set<string>([...usedInRound, ...usedInDay]);
  const candidates = getReplacementCandidates({
    category,
    excludeExerciseIds: exclude,
    availableEquipment,
    dislikedExerciseIds: dislikedIds,
    expertiseFilter,
  });
  const pick = pickReplacementCandidate(candidates, favoriteIds, seed);
  if (!pick) return null;

  const meta = exerciseMap[pick.id];
  const targetReps = meta
    ? formatPlanTargetPrescription(meta, exerciseSettings?.[pick.id], {
        expertiseByGroup: expertiseFilter?.byGroup,
      })
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
  if (isPplProgramProfile(profile)) {
    return [];
  }
  if (
    !profile.layoutMode &&
    isBalancedProfile(profile.scores, profile.customized)
  ) {
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
  expertiseFilter?: ExpertiseFilter | null,
): RoundExercise[] {
  const weights = profile.layoutMode
    ? weightsFromScores(scoresFromPreset("balanced"))
    : weightsFromScores(profile.scores);
  const target = Math.max(2, Math.min(8, ROUND_DENSITY_TARGETS[density]));
  const pool = expandedCategoryPool(plan, profile);
  if (profile.layoutMode && pool.length === 0) {
    return [];
  }
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
      expertiseFilter,
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
  userSettings?: UserSettings,
): DayPlan {
  const profile = profileInput ?? buildProgramProfileInput(preset);
  const dislikedIds = collectDislikedIds(prefs);
  const favoriteIds = collectFavoriteIds(prefs);
  const usedInDay = new Set<string>();
  const expertiseFilter = userSettings
    ? resolveExpertiseFilter(userSettings)
    : undefined;

  if (profile.customMode) {
    if (plan.restDayMode === "full_rest") {
      return { ...plan, rounds: [] };
    }
    return {
      ...plan,
      rounds: plan.rounds.map((round) => ({ ...round, exercises: [] })),
    };
  }

  if (plan.restDayMode === "full_rest" || plan.restDayMode === "stretches") {
    return { ...plan, rounds: [] };
  }

  if (profile.layoutMode && expandedCategoryPool(plan, profile).length === 0) {
    return { ...plan, rounds: [] };
  }

  if (isPplProgramProfile(profile)) {
    return materializePplDayPlan(
      plan,
      density,
      prefs,
      availableEquipment,
      exerciseSettings,
      varietySeed,
      userSettings,
    );
  }

  if (profile.layoutMode) {
    return materializeLayoutDayPlan(
      plan,
      density,
      availableEquipment,
      dislikedIds,
      favoriteIds,
      profile.weeklyCategoryLayout ?? {},
      profile.weeklyLayoutDayStructure,
      exerciseSettings,
      varietySeed,
      expertiseFilter,
    );
  }

  if (profile.blueprintMode && userSettings) {
    return materializeBlueprintDayPlanFromSettings(
      plan,
      {
        ...userSettings,
        weekBlueprint: profile.weekBlueprint ?? userSettings.weekBlueprint,
      },
      density,
      availableEquipment,
      dislikedIds,
      favoriteIds,
      exerciseSettings,
      varietySeed,
      expertiseFilter,
    );
  }

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
        expertiseFilter,
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
  userSettings?: UserSettings,
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
      userSettings,
    );
  }
  return out;
}
