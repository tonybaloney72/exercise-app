import { normalizeDayPlanCardio } from "@/lib/cardioActivities";
import {
  collectDislikedIds,
  collectFavoriteIds,
  getReplacementCandidates,
  pickReplacementCandidate,
  type ExpertiseFilter,
} from "@/lib/exerciseCandidates";
import { exerciseMap } from "@/data/exercises";
import { formatPlanTargetPrescription } from "@/utils/effectiveExerciseSettings";
import type {
  DayPlan,
  ExerciseCategory,
  ExerciseEquipment,
  RoundDensity,
  RoundExercise,
} from "@/types";
import {
  LAYOUT_GROUP_TO_CATEGORY,
  categoriesForDayLayout,
  layoutGroupsForDay,
  type LayoutGroup,
  type WeeklyCategoryLayout,
} from "@/lib/weeklyCategoryLayout";
import {
  buildLayoutRoundSpecs,
  resolveLayoutDayStructure,
  resolveMixedRoundCount,
  type WeeklyLayoutDayStructure,
} from "@/lib/weeklyLayoutDayStructure";
const ROUND_DENSITY_TARGETS: Record<RoundDensity, number> = {
  compact: 3,
  standard: 5,
  full: 7,
};

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
      `d${plan.dayOfWeek}-r${roundNumber}-i${i}-lg:${category}-v:${variety}`,
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

function cloneExercises(exercises: RoundExercise[]): RoundExercise[] {
  return exercises.map((e) => ({ ...e }));
}

/** Materialize a layout-mode day using blocks / repeat / mixed structure. */
export function materializeLayoutDayPlan(
  plan: DayPlan,
  density: RoundDensity,
  availableEquipment: ExerciseEquipment[],
  dislikedIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  weeklyLayout: WeeklyCategoryLayout,
  weeklyStructure: WeeklyLayoutDayStructure | undefined,
  exerciseSettings?: import("@/lib/repos").ExerciseSettingsMap,
  varietySeed?: string,
  expertiseFilter?: ExpertiseFilter | null,
): DayPlan {
  const enabled = weeklyLayout[plan.dayOfWeek] ?? [];
  if (enabled.length === 0) {
    return normalizeDayPlanCardio({ ...plan, rounds: [] });
  }

  const structure = resolveLayoutDayStructure(
    plan.dayOfWeek,
    enabled,
    weeklyStructure,
  );
  const catalogRoundCount = plan.rounds.length || 3;
  const target = Math.max(
    2,
    Math.min(8, ROUND_DENSITY_TARGETS[density]),
  );

  if (structure.mode === "mixed") {
    const pool = categoriesForDayLayout(
      plan,
      layoutGroupsForDay(plan, enabled),
    );
    if (pool.length === 0) return finalizeLayoutDayPlan({ ...plan, rounds: [] });

    const usedInDay = new Set<string>();
    const mixedRoundCount = resolveMixedRoundCount(structure, catalogRoundCount);
    const rounds = Array.from({ length: mixedRoundCount }, (_, index) => {
      const roundNumber = index + 1;
      const categories: ExerciseCategory[] = [];
      const stubs: RoundExercise[] = [];
      let guard = 0;
      while (categories.length < target && guard < 12) {
        guard += 1;
        const poolRotated = [
          ...pool.slice((roundNumber - 1) % pool.length),
          ...pool.slice(0, (roundNumber - 1) % pool.length),
        ];
        const counts = new Map<ExerciseCategory, number>();
        for (const s of stubs) {
          counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
        }
        const ranked = [...poolRotated].sort(
          (a, b) =>
            (counts.get(a) ?? 0) - (counts.get(b) ?? 0) ||
            poolRotated.indexOf(a) - poolRotated.indexOf(b),
        );
        const cat = ranked[0];
        if (!cat) break;
        categories.push(cat);
        stubs.push({
          exerciseId: `__stub-${categories.length}`,
          category: cat,
          targetReps: "1",
        });
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
          `d${plan.dayOfWeek}-r${roundNumber}-mix-i${i}-v:${varietySeed ?? "static"}`,
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

      return { roundNumber, exercises };
    });

    return finalizeLayoutDayPlan({ ...plan, rounds });
  }

  const specs = buildLayoutRoundSpecs(
    enabled,
    structure,
    catalogRoundCount,
  );
  const shouldRepeat =
    structure.mode === "repeat" || structure.repeatStrength;
  const repeatCache = new Map<LayoutGroup, RoundExercise[]>();
  const usedInDay = new Set<string>();

  const rounds = specs.map((spec) => {
    const group = spec.group as LayoutGroup;
    if (shouldRepeat && repeatCache.has(group)) {
      return {
        roundNumber: spec.roundNumber,
        exercises: cloneExercises(repeatCache.get(group)!),
      };
    }

    const category = LAYOUT_GROUP_TO_CATEGORY[group];
    const exercises = fillCategorySlots(
      category,
      target,
      plan,
      spec.roundNumber,
      availableEquipment,
      dislikedIds,
      favoriteIds,
      usedInDay,
      exerciseSettings,
      varietySeed,
      expertiseFilter,
    );

    if (shouldRepeat && exercises.length > 0) {
      repeatCache.set(group, cloneExercises(exercises));
    }

    return { roundNumber: spec.roundNumber, exercises };
  });

  return finalizeLayoutDayPlan({ ...plan, rounds });
}

/** Keep endurance block from {@link prepareWeekSeedForUser} (Cardio & endurance settings). */
function finalizeLayoutDayPlan(plan: DayPlan): DayPlan {
  return normalizeDayPlanCardio(plan);
}
