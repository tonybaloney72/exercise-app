import { normalizeDayPlanCardio } from "@/lib/cardioActivities";
import { migrateDayPlan } from "@/lib/cpToPcMigration";
import { cloneStretchEntries } from "@/lib/stretchDefaults";
import { MAX_WORKOUT_ROUNDS } from "@/lib/workoutLogStructure";
import type {
  DayPlan,
  Round,
  WorkoutDayTemplate,
  WorkoutDayTemplateSnapshot,
} from "@/types";

export const MAX_WORKOUT_DAY_TEMPLATES = 30;
const TEMPLATE_NAME_MAX_LEN = 80;

export type TemplateApplyMode =
  | "replace_day"
  | "append_rounds"
  | "replace_round";

export type ApplyTemplateOptions = {
  mode: TemplateApplyMode;
  /** 0-based day round index for {@link TemplateApplyMode} `replace_round`. */
  replaceRoundIndex?: number;
};

export function normalizeTemplateName(raw: string): string | null {
  const name = raw.trim().slice(0, TEMPLATE_NAME_MAX_LEN);
  return name.length > 0 ? name : null;
}

export function dayPlanToTemplateSnapshot(plan: DayPlan): WorkoutDayTemplateSnapshot {
  const normalized = normalizeDayPlanCardio(plan);
  return {
    restDayMode: normalized.restDayMode,
    strengthFocus: [...normalized.strengthFocus],
    coreGroups: [...normalized.coreGroups],
    rounds: normalized.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      exercises: round.exercises.map((ex) => ({ ...ex })),
    })),
    warmUp: normalized.warmUp
      ? cloneStretchEntries(normalized.warmUp)
      : undefined,
    coolDown: normalized.coolDown
      ? cloneStretchEntries(normalized.coolDown)
      : undefined,
    cardioActivities: normalized.cardioActivities?.map((a) => ({ ...a })),
    hasJog: normalized.hasJog,
  };
}

function cloneRounds(rounds: readonly Round[]): Round[] {
  return rounds.map((round) => ({
    roundNumber: round.roundNumber,
    exercises: round.exercises.map((ex) => ({ ...ex })),
  }));
}

function renumberTemplateRounds(rounds: readonly Round[]): Round[] {
  return rounds.map((round, index) => ({
    ...round,
    roundNumber: index + 1,
    exercises: round.exercises.map((ex) => ({ ...ex })),
  }));
}

/** True when the template carries stretches or cardio (day-level extras). */
export function templateHasDayExtras(
  plan: WorkoutDayTemplateSnapshot,
): boolean {
  return (
    (plan.warmUp?.length ?? 0) > 0 ||
    (plan.coolDown?.length ?? 0) > 0 ||
    (plan.cardioActivities?.length ?? 0) > 0
  );
}

/**
 * Single-round templates without stretches/cardio default to append;
 * fuller day templates default to replace.
 */
export function defaultTemplateApplyMode(
  plan: WorkoutDayTemplateSnapshot,
): TemplateApplyMode {
  if (plan.rounds.length === 1 && !templateHasDayExtras(plan)) {
    return "append_rounds";
  }
  return "replace_day";
}

/** Merge template structure onto a day; keeps name, theme, and dayOfWeek. */
export function applyTemplateToDayPlan(
  target: DayPlan,
  snapshot: WorkoutDayTemplateSnapshot,
): DayPlan {
  return applyTemplateToDayPlanWithMode(target, snapshot, {
    mode: "replace_day",
  });
}

export function applyTemplateToDayPlanWithMode(
  target: DayPlan,
  snapshot: WorkoutDayTemplateSnapshot,
  options: ApplyTemplateOptions,
): DayPlan {
  if (options.mode === "replace_day") {
    return normalizeDayPlanCardio({
      ...target,
      restDayMode: snapshot.restDayMode ?? target.restDayMode,
      strengthFocus: [...snapshot.strengthFocus],
      coreGroups: [...snapshot.coreGroups],
      rounds: renumberTemplateRounds(snapshot.rounds),
      warmUp: snapshot.warmUp
        ? cloneStretchEntries(snapshot.warmUp)
        : undefined,
      coolDown: snapshot.coolDown
        ? cloneStretchEntries(snapshot.coolDown)
        : undefined,
      cardioActivities: snapshot.cardioActivities?.map((a) => ({ ...a })),
    });
  }

  const incoming = cloneRounds(snapshot.rounds);
  if (incoming.length === 0) {
    return target;
  }

  if (options.mode === "append_rounds") {
    const room = Math.max(0, MAX_WORKOUT_ROUNDS - target.rounds.length);
    const appended = incoming.slice(0, room);
    return normalizeDayPlanCardio({
      ...target,
      rounds: renumberTemplateRounds([
        ...cloneRounds(target.rounds),
        ...appended,
      ]),
    });
  }

  // replace_round: splice template rounds in place of one day round.
  const rawIndex = options.replaceRoundIndex ?? 0;
  const roundIndex =
    target.rounds.length === 0
      ? 0
      : Math.max(0, Math.min(rawIndex, target.rounds.length - 1));
  const before = cloneRounds(target.rounds.slice(0, roundIndex));
  const after = cloneRounds(target.rounds.slice(roundIndex + 1));
  const room = Math.max(0, MAX_WORKOUT_ROUNDS - before.length - after.length);
  const inserted = incoming.slice(0, room);
  return normalizeDayPlanCardio({
    ...target,
    rounds: renumberTemplateRounds([...before, ...inserted, ...after]),
  });
}

export function sortTemplatesByName(
  templates: WorkoutDayTemplate[],
): WorkoutDayTemplate[] {
  return [...templates].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/** Empty day structure for creating a template from scratch. */
export function emptyWorkoutDayTemplateSnapshot(): WorkoutDayTemplateSnapshot {
  return {
    strengthFocus: [],
    coreGroups: [],
    rounds: [{ roundNumber: 1, exercises: [] }],
    cardioActivities: [],
    hasJog: false,
  };
}

const EDITOR_DAY_SHELL: DayPlan = {
  dayOfWeek: 0,
  name: "",
  theme: "",
  hasJog: false,
  strengthFocus: [],
  coreGroups: [],
  rounds: [{ roundNumber: 1, exercises: [] }],
};

/** Lift a template into a DayPlan for {@link WorkoutPlanEditor}. */
export function templateToEditorDayPlan(
  name: string,
  plan: WorkoutDayTemplateSnapshot,
): DayPlan {
  return {
    ...applyTemplateToDayPlan(EDITOR_DAY_SHELL, plan),
    name,
  };
}

export function templatePlanSummary(plan: WorkoutDayTemplateSnapshot): string {
  const roundCount = plan.rounds.length;
  const exerciseCount = plan.rounds.reduce(
    (n, r) => n + r.exercises.length,
    0,
  );
  const cardioCount = plan.cardioActivities?.length ?? 0;
  const parts = [
    `${roundCount} round${roundCount === 1 ? "" : "s"}`,
    `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`,
  ];
  if (cardioCount > 0) {
    parts.push(`${cardioCount} cardio`);
  }
  return parts.join(" · ");
}

export function sanitizeTemplateSnapshot(
  raw: unknown,
): WorkoutDayTemplateSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.rounds) || !Array.isArray(o.strengthFocus)) {
    return null;
  }
  const plan = dayPlanToTemplateSnapshot(
    migrateDayPlan({
      dayOfWeek: 0,
      name: "",
      theme: "",
      hasJog: false,
      strengthFocus: o.strengthFocus as DayPlan["strengthFocus"],
      coreGroups: (o.coreGroups as DayPlan["coreGroups"]) ?? [],
      rounds: o.rounds as DayPlan["rounds"],
      warmUp: o.warmUp as DayPlan["warmUp"],
      coolDown: o.coolDown as DayPlan["coolDown"],
      cardioActivities: o.cardioActivities as DayPlan["cardioActivities"],
      restDayMode: o.restDayMode as DayPlan["restDayMode"],
    }),
  );
  return plan;
}
