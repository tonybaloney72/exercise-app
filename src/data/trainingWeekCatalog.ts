/**
 * Author **week themes** — seed for materialization only.
 * Rounds define count per day; exercise slots are always filled by `programProfile` + catalog picks.
 * Production reads go through `planResolver` (persisted or materialized week).
 */
import type { TrainingWeekDays } from "@/lib/repos";
import type { DayPlan, ExerciseCategory } from "@/types";

type DayThemeInput = {
  dayOfWeek: number;
  name: string;
  theme: string;
  hasJog: boolean;
  strengthFocus: ExerciseCategory[];
  coreGroups: ExerciseCategory[];
  roundCount: number;
};

function buildDayTheme(input: DayThemeInput): DayPlan {
  const { roundCount, ...meta } = input;
  return {
    ...meta,
    rounds: Array.from({ length: roundCount }, (_, index) => ({
      roundNumber: index + 1,
      exercises: [],
    })),
  };
}

export const TRAINING_WEEK_CATALOG: DayPlan[] = [
  buildDayTheme({
    dayOfWeek: 0,
    name: "Sunday",
    theme: "Lower Body + Core",
    hasJog: false,
    strengthFocus: ["LB"],
    coreGroups: ["CR", "CS"],
    roundCount: 3,
  }),
  buildDayTheme({
    dayOfWeek: 1,
    name: "Monday",
    theme: "Upper Push + Core Front + Core Lower Abs",
    hasJog: true,
    strengthFocus: ["UP"],
    coreGroups: ["CF", "CL"],
    roundCount: 3,
  }),
  buildDayTheme({
    dayOfWeek: 2,
    name: "Tuesday",
    theme: "Lower Body + Core Rotational + Core Stability",
    hasJog: true,
    strengthFocus: ["LB"],
    coreGroups: ["CR", "CS"],
    roundCount: 3,
  }),
  buildDayTheme({
    dayOfWeek: 3,
    name: "Wednesday",
    theme: "Upper Pull + Core Front + Core Rotational",
    hasJog: true,
    strengthFocus: ["UPL"],
    coreGroups: ["CF", "CR"],
    roundCount: 3,
  }),
  buildDayTheme({
    dayOfWeek: 4,
    name: "Thursday",
    theme: "Lower Body + Cardio/Plyo + Core Lower Abs + Core Stability",
    hasJog: true,
    strengthFocus: ["LB", "PC"],
    coreGroups: ["CL", "CS"],
    roundCount: 3,
  }),
  buildDayTheme({
    dayOfWeek: 5,
    name: "Friday",
    theme: "Upper Push + Upper Pull + Core Front + Core Lower Abs",
    hasJog: true,
    strengthFocus: ["UP", "UPL"],
    coreGroups: ["CF", "CL"],
    roundCount: 3,
  }),
  buildDayTheme({
    dayOfWeek: 6,
    name: "Saturday",
    theme: "Lower Body + Cardio/Plyo + Core Rotational + Core Stability",
    hasJog: true,
    strengthFocus: ["LB", "PC"],
    coreGroups: ["CR", "CS"],
    roundCount: 3,
  }),
];

function cloneCatalogDay(plan: DayPlan): DayPlan {
  return {
    ...plan,
    strengthFocus: [...plan.strengthFocus],
    coreGroups: [...plan.coreGroups],
    rounds: plan.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      exercises: [],
    })),
  };
}

/** Seed template for one day (0 = Sunday). Not for production UI reads. */
export function getCatalogPlanForDay(dayOfWeek: number): DayPlan {
  const plan = TRAINING_WEEK_CATALOG.find((p) => p.dayOfWeek === dayOfWeek);
  if (!plan) {
    throw new Error(`No catalog plan for dayOfWeek ${dayOfWeek}`);
  }
  return cloneCatalogDay(plan);
}

/** Full Sun–Sat theme week for generator seeding (rounds empty until materialized). */
export function buildCatalogWeek(): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    out[i] = getCatalogPlanForDay(i);
  }
  return out;
}

/** True when the catalog seed has no prescribed exercise ids (themes-only). */
export function isThemesOnlyCatalogPlan(plan: DayPlan): boolean {
  return plan.rounds.every((round) => round.exercises.length === 0);
}
