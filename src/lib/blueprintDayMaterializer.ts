import {
  applyWeeklyCardioToDay,
  normalizeDayPlanCardio,
} from "@/lib/cardioActivities";
import {
  collectDislikedIds,
  collectFavoriteIds,
  getReplacementCandidates,
  pickReplacementCandidate,
  type ExpertiseFilter,
} from "@/lib/exerciseCandidates";
import { exerciseMap } from "@/data/exercises";
import { formatPlanTargetPrescription } from "@/utils/effectiveExerciseSettings";
import {
  categoriesForDayLayout,
  LAYOUT_GROUP_TO_CATEGORY,
  layoutGroupsForDay,
  type LayoutGroup,
} from "@/lib/weeklyCategoryLayout";
import type {
  DayBlueprint,
  RoundBlueprint,
  WeekBlueprint,
} from "@/lib/weekBlueprint";
import {
  resolveWeekBlueprint,
  roundBlueprintGroupsEqual,
  sanitizeBlueprintExerciseCount,
} from "@/lib/weekBlueprint";
import type {
  DayPlan,
  ExerciseCategory,
  ExerciseEquipment,
  RoundDensity,
  RoundExercise,
  UserSettings,
} from "@/types";

const ROUND_DENSITY_TARGETS: Record<RoundDensity, number> = {
  compact: 3,
  standard: 5,
  full: 7,
};

function cloneExercises(exercises: RoundExercise[]): RoundExercise[] {
  return exercises.map((e) => ({ ...e }));
}

function fillCategorySlots(
  category: ExerciseCategory,
  target: number,
  plan: DayPlan,
  roundNumber: number,
  availableEquipment: ExerciseEquipment[],
  dislikedIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  usedInDay: Set<string>,
  exerciseSettings?: import("@/lib/repos").ExerciseSettingsMap,
  varietySeed?: string,
  expertiseFilter?: ExpertiseFilter | null,
): RoundExercise[] {
  const usedInRound = new Set<string>();
  const rebuilt: RoundExercise[] = [];
  const variety = varietySeed?.trim() ? varietySeed.trim() : "static";

  for (let i = 0; i < target; i++) {
    const exclude = new Set<string>([...usedInRound, ...usedInDay]);
    const candidates = getReplacementCandidates({
      category,
      excludeExerciseIds: exclude,
      availableEquipment,
      dislikedExerciseIds: dislikedIds,
      expertiseFilter,
    });
    const pick = pickReplacementCandidate(
      candidates,
      favoriteIds,
      `d${plan.dayOfWeek}-r${roundNumber}-i${i}-bp:${category}-v:${variety}`,
    );
    if (!pick) continue;

    const meta = exerciseMap[pick.id];
    const targetReps = meta
      ? formatPlanTargetPrescription(meta, exerciseSettings?.[pick.id], {
          expertiseByGroup: expertiseFilter?.byGroup,
        })
      : pick.defaultReps;

    rebuilt.push({
      exerciseId: pick.id,
      category,
      targetReps,
    });
    usedInRound.add(pick.id);
    usedInDay.add(pick.id);
  }

  return rebuilt;
}

function exerciseTargetForRound(
  spec: RoundBlueprint,
  density: RoundDensity,
): number {
  if (spec.exerciseCount != null) {
    return sanitizeBlueprintExerciseCount(spec.exerciseCount);
  }
  return Math.max(2, Math.min(8, ROUND_DENSITY_TARGETS[density]));
}

/** Fill one round from its group allowlist (blended when multiple groups). */
function materializeRoundFromBlueprint(
  spec: RoundBlueprint,
  roundNumber: number,
  plan: DayPlan,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  dislikedIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  usedInDay: Set<string>,
  exerciseSettings?: import("@/lib/repos").ExerciseSettingsMap,
  varietySeed?: string,
  expertiseFilter?: ExpertiseFilter | null,
): RoundExercise[] {
  const groups = spec.groups.filter((g) =>
    layoutGroupsForDay(plan, spec.groups).includes(g),
  );
  if (groups.length === 0) return [];

  const pool = categoriesForDayLayout(plan, groups);
  if (pool.length === 0) return [];

  const target = exerciseTargetForRound(spec, density);
  const categories: ExerciseCategory[] = [];
  while (categories.length < target) {
    const poolRotated = [
      ...pool.slice((roundNumber - 1) % pool.length),
      ...pool.slice(0, (roundNumber - 1) % pool.length),
    ];
    const counts = new Map<ExerciseCategory, number>();
    for (const c of categories) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const ranked = [...poolRotated].sort(
      (a, b) =>
        (counts.get(a) ?? 0) - (counts.get(b) ?? 0) ||
        poolRotated.indexOf(a) - poolRotated.indexOf(b),
    );
    const cat = ranked[0];
    if (!cat) break;
    categories.push(cat);
  }

  const exercises: RoundExercise[] = [];
  const usedInRound = new Set<string>();
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]!;
    const exclude = new Set<string>([...usedInRound, ...usedInDay]);
    const candidates = getReplacementCandidates({
      category: cat,
      excludeExerciseIds: exclude,
      availableEquipment,
      dislikedExerciseIds: dislikedIds,
      expertiseFilter,
    });
    const pick = pickReplacementCandidate(
      candidates,
      favoriteIds,
      `d${plan.dayOfWeek}-r${roundNumber}-bp-mix-i${i}-v:${varietySeed ?? "static"}`,
    );
    if (!pick) continue;
    const meta = exerciseMap[pick.id];
    exercises.push({
      exerciseId: pick.id,
      category: cat,
      targetReps: meta
        ? formatPlanTargetPrescription(meta, exerciseSettings?.[pick.id], {
            expertiseByGroup: expertiseFilter?.byGroup,
          })
        : pick.defaultReps,
    });
    usedInRound.add(pick.id);
    usedInDay.add(pick.id);
  }

  return exercises;
}

function materializeSingleGroupRound(
  spec: RoundBlueprint,
  roundNumber: number,
  plan: DayPlan,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  dislikedIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  usedInDay: Set<string>,
  exerciseSettings?: import("@/lib/repos").ExerciseSettingsMap,
  varietySeed?: string,
  expertiseFilter?: ExpertiseFilter | null,
): RoundExercise[] {
  const group = spec.groups[0] as LayoutGroup | undefined;
  if (!group) return [];
  const category = LAYOUT_GROUP_TO_CATEGORY[group];
  return fillCategorySlots(
    category,
    exerciseTargetForRound(spec, density),
    plan,
    roundNumber,
    availableEquipment,
    dislikedIds,
    favoriteIds,
    usedInDay,
    exerciseSettings,
    varietySeed,
    expertiseFilter,
  );
}

/** Materialize a guided-custom day from its blueprint. */
export function materializeBlueprintDayPlan(
  plan: DayPlan,
  dayBlueprint: DayBlueprint,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  dislikedIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  exerciseSettings?: import("@/lib/repos").ExerciseSettingsMap,
  varietySeed?: string,
  expertiseFilter?: ExpertiseFilter | null,
): DayPlan {
  if (
    dayBlueprint.dayKind === "full_rest" ||
    dayBlueprint.dayKind === "stretches"
  ) {
    return normalizeDayPlanCardio({ ...plan, rounds: [] });
  }

  if (dayBlueprint.rounds.length === 0) {
    return normalizeDayPlanCardio({ ...plan, rounds: [] });
  }

  const usedInDay = new Set<string>();
  const built: RoundExercise[][] = [];

  for (let index = 0; index < dayBlueprint.rounds.length; index++) {
    const spec = dayBlueprint.rounds[index]!;
    const roundNumber = index + 1;
    const sourceIndex = spec.cloneOfRoundIndex;
    const cloneMode = spec.cloneMode;

    if (sourceIndex != null && cloneMode === "repeat") {
      const sourceSpec = dayBlueprint.rounds[sourceIndex];
      const canRepeatClone =
        sourceSpec != null &&
        roundBlueprintGroupsEqual(spec, sourceSpec) &&
        built[sourceIndex]?.length;
      if (canRepeatClone) {
        built.push(cloneExercises(built[sourceIndex]!));
        for (const ex of built[built.length - 1]!) {
          usedInDay.add(ex.exerciseId);
        }
        continue;
      }
    }

    let exercises: RoundExercise[];
    if (spec.groups.length === 1) {
      exercises = materializeSingleGroupRound(
        spec,
        roundNumber,
        plan,
        density,
        availableEquipment,
        dislikedIds,
        favoriteIds,
        usedInDay,
        exerciseSettings,
        varietySeed,
        expertiseFilter,
      );
    } else {
      exercises = materializeRoundFromBlueprint(
        spec,
        roundNumber,
        plan,
        density,
        availableEquipment,
        dislikedIds,
        favoriteIds,
        usedInDay,
        exerciseSettings,
        varietySeed,
        expertiseFilter,
      );
    }

    built.push(exercises);
  }

  const rounds = built.map((exercises, index) => ({
    roundNumber: index + 1,
    exercises,
  }));

  return applyWeeklyCardioToDay(
    { ...plan, rounds },
    dayBlueprint.cardio ?? [],
    availableEquipment,
  );
}

export function materializeBlueprintDayPlanFromSettings(
  plan: DayPlan,
  settings: UserSettings,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  dislikedIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  exerciseSettings?: import("@/lib/repos").ExerciseSettingsMap,
  varietySeed?: string,
  expertiseFilter?: ExpertiseFilter | null,
): DayPlan {
  const blueprint = resolveWeekBlueprint(settings);
  const day = blueprint[plan.dayOfWeek] ?? {
    dayKind: "full_rest" as const,
    rounds: [],
  };
  return materializeBlueprintDayPlan(
    plan,
    day,
    density,
    availableEquipment,
    dislikedIds,
    favoriteIds,
    exerciseSettings,
    varietySeed,
    expertiseFilter,
  );
}
