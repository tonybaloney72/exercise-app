import { normalizeDayPlanCardio } from "@/lib/cardioActivities";
import { migrateDayPlan } from "@/lib/cpToPcMigration";
import { cloneStretchEntries } from "@/lib/stretchDefaults";
import type {
  DayPlan,
  WorkoutDayTemplate,
  WorkoutDayTemplateSnapshot,
} from "@/types";

export const MAX_WORKOUT_DAY_TEMPLATES = 30;
const TEMPLATE_NAME_MAX_LEN = 80;

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

function renumberTemplateRounds(
  rounds: WorkoutDayTemplateSnapshot["rounds"],
): WorkoutDayTemplateSnapshot["rounds"] {
  return rounds.map((round, index) => ({
    ...round,
    roundNumber: index + 1,
    exercises: round.exercises.map((ex) => ({ ...ex })),
  }));
}

/** Merge template structure onto a day; keeps name, theme, and dayOfWeek. */
export function applyTemplateToDayPlan(
  target: DayPlan,
  snapshot: WorkoutDayTemplateSnapshot,
): DayPlan {
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

export function sortTemplatesByName(
  templates: WorkoutDayTemplate[],
): WorkoutDayTemplate[] {
  return [...templates].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
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
