/**
 * PPL day materialization: working sets repeat across rounds 1–3;
 * push/pull cardio stays in {@link DayPlan.cardioActivities} (endurance logging);
 * legs round 4 = core block.
 */
import { exerciseMap } from "@/data/exercises";
import {
  collectDislikedIds,
  collectFavoriteIds,
  getReplacementCandidates,
  pickReplacementCandidate,
  type ExpertiseFilter,
} from "@/lib/exerciseCandidates";
import { resolveExpertiseFilter } from "@/lib/expertiseLevels";
import { inferPplDayTypeFromSeed } from "@/lib/pplWeekSchedule";
import { strengthFocusForPplDayType } from "@/lib/pplWeekTypes";
import {
  PPL_CORE_BLOCK_COUNT,
  PPL_LEG_CORE_ROUND,
  PPL_RECOVERY_COUNT,
  pplWorkingExerciseCount,
} from "@/lib/pplRoundDensity";
import { formatPlanTargetPrescription } from "@/utils/effectiveExerciseSettings";
import type { ExercisePreferenceMap, ExerciseSettingsMap } from "@/lib/repos";
import type {
  DayPlan,
  ExerciseCategory,
  RoundDensity,
  RoundExercise,
  UserSettings,
} from "@/types";

const WORKING_ROUNDS = [1, 2, 3] as const;

function isRecoveryPlan(plan: DayPlan): boolean {
  return (
    plan.restDayMode === "active_recovery" ||
    (plan.strengthFocus.length === 0 &&
      plan.coreGroups.length === 1 &&
      plan.coreGroups[0] === "CS")
  );
}

function fillPplSlot(
  category: ExerciseCategory,
  usedInBatch: Set<string>,
  availableEquipment: UserSettings["availableEquipment"],
  dislikedIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  seed: string,
  exerciseSettings?: ExerciseSettingsMap,
  expertiseFilter?: ExpertiseFilter | null,
): RoundExercise | null {
  const candidates = getReplacementCandidates({
    category,
    excludeExerciseIds: usedInBatch,
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

function pickExercisesForCategory(
  category: ExerciseCategory,
  count: number,
  ctx: {
    availableEquipment: UserSettings["availableEquipment"];
    dislikedIds: ReadonlySet<string>;
    favoriteIds: ReadonlySet<string>;
    exerciseSettings?: ExerciseSettingsMap;
    expertiseFilter?: ExpertiseFilter | null;
    seedPrefix: string;
  },
): RoundExercise[] {
  const used = new Set<string>();
  const out: RoundExercise[] = [];
  for (let i = 0; i < count; i++) {
    const filled = fillPplSlot(
      category,
      used,
      ctx.availableEquipment,
      ctx.dislikedIds,
      ctx.favoriteIds,
      `${ctx.seedPrefix}-${category}-${i}`,
      ctx.exerciseSettings,
      ctx.expertiseFilter,
    );
    if (!filled) break;
    out.push(filled);
    used.add(filled.exerciseId);
  }
  return out;
}

function pickCoreBlockExercises(
  plan: DayPlan,
  count: number,
  ctx: Parameters<typeof pickExercisesForCategory>[2],
): RoundExercise[] {
  const groups =
    plan.coreGroups.length > 0 ? plan.coreGroups : (["CS"] as ExerciseCategory[]);
  const out: RoundExercise[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const category = groups[i % groups.length]!;
    const filled = fillPplSlot(
      category,
      used,
      ctx.availableEquipment,
      ctx.dislikedIds,
      ctx.favoriteIds,
      `${ctx.seedPrefix}-core-${i}-${category}`,
      ctx.exerciseSettings,
      ctx.expertiseFilter,
    );
    if (!filled) continue;
    out.push(filled);
    used.add(filled.exerciseId);
  }
  return out;
}

function cloneExercises(exercises: RoundExercise[]): RoundExercise[] {
  return exercises.map((e) => ({ ...e }));
}

function materializeRecoveryDay(
  plan: DayPlan,
  density: RoundDensity,
  ctx: Parameters<typeof pickExercisesForCategory>[2],
): RoundExercise[][] {
  const count = PPL_RECOVERY_COUNT[density];
  const core = pickExercisesForCategory("CS", count, {
    ...ctx,
    seedPrefix: `${ctx.seedPrefix}-recovery`,
  });
  return [core];
}

function materializePushPullDay(
  dayType: "push" | "pull",
  density: RoundDensity,
  ctx: Parameters<typeof pickExercisesForCategory>[2],
): RoundExercise[][] {
  const category = strengthFocusForPplDayType(dayType)[0]!;
  const workingCount = pplWorkingExerciseCount(density);
  const working = pickExercisesForCategory(category, workingCount, {
    ...ctx,
    seedPrefix: `${ctx.seedPrefix}-working`,
  });
  return [
    cloneExercises(working),
    cloneExercises(working),
    cloneExercises(working),
  ];
}

function materializeLegsDay(
  plan: DayPlan,
  density: RoundDensity,
  ctx: Parameters<typeof pickExercisesForCategory>[2],
): RoundExercise[][] {
  const workingCount = pplWorkingExerciseCount(density);
  const working = pickExercisesForCategory("LB", workingCount, {
    ...ctx,
    seedPrefix: `${ctx.seedPrefix}-legs`,
  });
  const coreBlock = pickCoreBlockExercises(plan, PPL_CORE_BLOCK_COUNT[density], {
    ...ctx,
    seedPrefix: `${ctx.seedPrefix}-core-block`,
  });
  return [
    cloneExercises(working),
    cloneExercises(working),
    cloneExercises(working),
    coreBlock,
  ];
}

function materializeActiveRecoveryShell(
  plan: DayPlan,
  density: RoundDensity,
  ctx: Parameters<typeof pickExercisesForCategory>[2],
): RoundExercise[][] {
  const count = Math.min(
    PPL_RECOVERY_COUNT[density],
    Math.max(2, plan.coreGroups.length * 2),
  );
  const out: RoundExercise[] = [];
  const used = new Set<string>();
  const groups =
    plan.coreGroups.length > 0 ? plan.coreGroups : (["CR", "CS"] as ExerciseCategory[]);
  for (let i = 0; i < count; i++) {
    const category = groups[i % groups.length]!;
    const filled = fillPplSlot(
      category,
      used,
      ctx.availableEquipment,
      ctx.dislikedIds,
      ctx.favoriteIds,
      `${ctx.seedPrefix}-ar-${i}`,
      ctx.exerciseSettings,
      ctx.expertiseFilter,
    );
    if (filled) {
      out.push(filled);
      used.add(filled.exerciseId);
    }
  }
  return [out];
}

/** Build round exercise lists for a PPL day (does not apply dislikes). */
export function buildPplRoundExerciseSets(
  plan: DayPlan,
  density: RoundDensity,
  prefs: ExercisePreferenceMap,
  availableEquipment: UserSettings["availableEquipment"],
  exerciseSettings?: ExerciseSettingsMap,
  varietySeed?: string,
  userSettings?: UserSettings,
): RoundExercise[][] {
  const dayType = inferPplDayTypeFromSeed(plan);
  if (dayType === null) {
    return [];
  }
  const ctx = {
    availableEquipment,
    dislikedIds: collectDislikedIds(prefs),
    favoriteIds: collectFavoriteIds(prefs),
    exerciseSettings,
    expertiseFilter: userSettings ? resolveExpertiseFilter(userSettings) : undefined,
    seedPrefix: `ppl-d${plan.dayOfWeek}-v:${varietySeed?.trim() || "static"}`,
  };

  if (isRecoveryPlan(plan)) {
    return materializeRecoveryDay(plan, density, ctx);
  }

  switch (dayType) {
    case "push":
      return materializePushPullDay("push", density, ctx);
    case "pull":
      return materializePushPullDay("pull", density, ctx);
    case "legs":
      return materializeLegsDay(plan, density, ctx);
    case "active_recovery":
      return materializeActiveRecoveryShell(plan, density, ctx);
    default: {
      const _exhaustive: never = dayType;
      return _exhaustive;
    }
  }
}

/**
 * Apply PPL set structure. Push/pull keep {@link DayPlan.cardioActivities} for
 * endurance logging (Cardio section) — not strength round slots.
 */
export function materializePplDayPlan(
  plan: DayPlan,
  density: RoundDensity,
  prefs: ExercisePreferenceMap,
  availableEquipment: UserSettings["availableEquipment"],
  exerciseSettings?: ExerciseSettingsMap,
  varietySeed?: string,
  userSettings?: UserSettings,
): DayPlan {
  const roundSets = buildPplRoundExerciseSets(
    plan,
    density,
    prefs,
    availableEquipment,
    exerciseSettings,
    varietySeed,
    userSettings,
  );

  return {
    ...plan,
    rounds: roundSets.map((exercises, index) => ({
      roundNumber: index + 1,
      exercises,
    })),
  };
}

export { PPL_LEG_CORE_ROUND };
