/**
 * 6-day push / pull / legs week shells for Preset mode (PPL epic).
 * Rounds are empty until `programProfile` + generator fill them (Phase 2+).
 * @see ROADMAP.md — 6-day PPL week engine
 */
import {
  DEFAULT_WEEKLY_PPL_SCHEDULE,
  resolveWeeklyPplSchedule,
  sanitizePplWeeklyCardioByDayForSchedule,
  suggestWeeklyCardioFromPplSchedule,
  pplWeeklyCardioEligibleDaysFromSchedule,
  buildPplDayPlanFromSchedule,
  pplTemplateFingerprintWithSchedule,
} from "@/lib/pplWeekSchedule";
import type { TrainingWeekDays } from "@/lib/repos";
import type {
  CardioActivityKind,
  DayPlan,
  ExerciseCategory,
  UserSettings,
  WeeklyPplSchedule,
} from "@/types";

/** Bump when Balanced shells or finisher defaults change (week fingerprint / migration). */
export const PPL_TEMPLATE_VERSION = "ppl-2026-05-v4";

export type PplWeekVariant = "balanced";

export type PplDayType = "active_recovery" | "push" | "pull" | "legs";

const PPL_DAY_TYPE_LABELS: Record<PplDayType, string> = {
  active_recovery: "Active recovery",
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

/** Core categories used on leg days (abs / core work — not on push or pull). */
export const PPL_LEG_DAY_CORE_GROUPS: ExerciseCategory[] = [
  "CF",
  "CL",
  "CR",
  "CS",
];

/** Light core on Sunday base shell (overridden to CS-only when rest = active_recovery). */
const PPL_RECOVERY_CORE_GROUPS: ExerciseCategory[] = ["CR", "CS"];

export interface PplDayShell {
  dayOfWeek: number;
  name: string;
  theme: string;
  dayType: PplDayType;
  roundCount: number;
  /** User-facing cardio finisher (→ `hasJog` / `cardioActivities` after apply). */
  hasCardioFinisher: boolean;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Classic 6-day PPL + Sunday recovery (Balanced preset calendar). */
export const PPL_BALANCED_SHELLS: readonly PplDayShell[] = [
  {
    dayOfWeek: 0,
    name: DAY_NAMES[0],
    theme: "Active recovery — light core + cardio",
    dayType: "active_recovery",
    roundCount: 1,
    hasCardioFinisher: true,
  },
  {
    dayOfWeek: 1,
    name: DAY_NAMES[1],
    theme: "Push — upper push + cardio finisher",
    dayType: "push",
    roundCount: 3,
    hasCardioFinisher: true,
  },
  {
    dayOfWeek: 2,
    name: DAY_NAMES[2],
    theme: "Pull — upper pull + cardio finisher",
    dayType: "pull",
    roundCount: 3,
    hasCardioFinisher: true,
  },
  {
    dayOfWeek: 3,
    name: DAY_NAMES[3],
    theme: "Legs — lower body + core block",
    dayType: "legs",
    roundCount: 4,
    hasCardioFinisher: false,
  },
  {
    dayOfWeek: 4,
    name: DAY_NAMES[4],
    theme: "Push — upper push + cardio finisher",
    dayType: "push",
    roundCount: 3,
    hasCardioFinisher: true,
  },
  {
    dayOfWeek: 5,
    name: DAY_NAMES[5],
    theme: "Pull — upper pull + cardio finisher",
    dayType: "pull",
    roundCount: 3,
    hasCardioFinisher: true,
  },
  {
    dayOfWeek: 6,
    name: DAY_NAMES[6],
    theme: "Legs — lower body + core block",
    dayType: "legs",
    roundCount: 4,
    hasCardioFinisher: false,
  },
] as const;

function shellsForPplVariant(
  variant: PplWeekVariant = "balanced",
): readonly PplDayShell[] {
  switch (variant) {
    case "balanced":
      return PPL_BALANCED_SHELLS;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

export function strengthFocusForPplDayType(
  dayType: PplDayType,
): ExerciseCategory[] {
  switch (dayType) {
    case "push":
      return ["UP"];
    case "pull":
      return ["UPL"];
    case "legs":
      return ["LB"];
    case "active_recovery":
      return [];
    default: {
      const _exhaustive: never = dayType;
      return _exhaustive;
    }
  }
}

export function coreGroupsForPplDayType(
  dayType: PplDayType,
): ExerciseCategory[] {
  switch (dayType) {
    case "legs":
      return [...PPL_LEG_DAY_CORE_GROUPS];
    case "active_recovery":
      return [...PPL_RECOVERY_CORE_GROUPS];
    case "push":
    case "pull":
      return [];
    default: {
      const _exhaustive: never = dayType;
      return _exhaustive;
    }
  }
}

function getPplShellForDay(
  dayOfWeek: number,
  variant: PplWeekVariant = "balanced",
): PplDayShell {
  const shell = shellsForPplVariant(variant).find((s) => s.dayOfWeek === dayOfWeek);
  if (!shell) {
    throw new Error(`No PPL shell for dayOfWeek ${dayOfWeek} (${variant})`);
  }
  return shell;
}

export function getPplDayType(
  dayOfWeek: number,
  variant: PplWeekVariant = "balanced",
): PplDayType {
  return getPplShellForDay(dayOfWeek, variant).dayType;
}

/** Materialize a {@link DayPlan} seed from a PPL shell (empty exercise slots). */
function buildPplDayPlan(shell: PplDayShell): DayPlan {
  return {
    dayOfWeek: shell.dayOfWeek,
    name: shell.name,
    theme: shell.theme,
    hasJog: shell.hasCardioFinisher,
    strengthFocus: strengthFocusForPplDayType(shell.dayType),
    coreGroups: coreGroupsForPplDayType(shell.dayType),
    rounds: Array.from({ length: shell.roundCount }, (_, index) => ({
      roundNumber: index + 1,
      exercises: [],
    })),
  };
}

function clonePplDay(plan: DayPlan): DayPlan {
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

/** Seed template for one day (0 = Sunday). */
export function getPplPlanForDay(
  dayOfWeek: number,
  variantOrSettings: PplWeekVariant | UserSettings = "balanced",
): DayPlan {
  if (typeof variantOrSettings === "object") {
    const schedule = resolveWeeklyPplSchedule(variantOrSettings);
    return clonePplDay(buildPplDayPlanFromSchedule(dayOfWeek, schedule));
  }
  return clonePplDay(buildPplDayPlan(getPplShellForDay(dayOfWeek, variantOrSettings)));
}

/** Full Sun–Sat PPL week for generator seeding (rounds empty until materialized). */
export function buildPplWeek(
  variantOrSettings: PplWeekVariant | UserSettings = "balanced",
): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  if (typeof variantOrSettings === "object") {
    const schedule = resolveWeeklyPplSchedule(variantOrSettings);
    for (let dow = 0; dow < 7; dow++) {
      out[dow] = getPplPlanForDay(dow, variantOrSettings);
    }
    return out;
  }
  for (const shell of shellsForPplVariant(variantOrSettings)) {
    out[shell.dayOfWeek] = getPplPlanForDay(shell.dayOfWeek, variantOrSettings);
  }
  return out;
}

/** True when the PPL seed has no prescribed exercise ids (themes-only). */
export function isThemesOnlyPplPlan(plan: DayPlan): boolean {
  return plan.rounds.every((round) => round.exercises.length === 0);
}

/** Weekdays where PPL preset uses cardio (from schedule or classic shells). */
export function pplWeeklyCardioEligibleDays(
  variantOrSchedule: PplWeekVariant | WeeklyPplSchedule = "balanced",
): number[] {
  if (typeof variantOrSchedule === "object") {
    return pplWeeklyCardioEligibleDaysFromSchedule(variantOrSchedule);
  }
  return shellsForPplVariant(variantOrSchedule)
    .filter((shell) => shell.hasCardioFinisher)
    .map((shell) => shell.dayOfWeek);
}

/** Strip cardio on days without a finisher in the user's schedule. */
export function sanitizePplWeeklyCardioByDay(
  byDay: Record<number, CardioActivityKind[]>,
  variantOrSchedule: PplWeekVariant | WeeklyPplSchedule = "balanced",
): Record<number, CardioActivityKind[]> {
  if (typeof variantOrSchedule === "object") {
    return sanitizePplWeeklyCardioByDayForSchedule(byDay, variantOrSchedule);
  }
  const eligible = new Set(pplWeeklyCardioEligibleDays(variantOrSchedule));
  const out: Record<number, CardioActivityKind[]> = {};
  for (let dow = 0; dow < 7; dow++) {
    out[dow] = eligible.has(dow) ? [...(byDay[dow] ?? [])] : [];
  }
  return out;
}

/** Default weekly cardio from schedule (or classic shells). */
export function suggestWeeklyCardioFromPpl(
  variantOrSchedule: PplWeekVariant | WeeklyPplSchedule = "balanced",
): Record<number, CardioActivityKind[]> {
  if (typeof variantOrSchedule === "object") {
    return suggestWeeklyCardioFromPplSchedule(variantOrSchedule);
  }
  const out: Record<number, CardioActivityKind[]> = {};
  for (const shell of shellsForPplVariant(variantOrSchedule)) {
    out[shell.dayOfWeek] = shell.hasCardioFinisher ? ["jog"] : [];
  }
  return out;
}

/** Fingerprint segment for prefs / week regen. */
export function pplTemplateFingerprint(
  settings?: UserSettings,
): string {
  if (settings) {
    return pplTemplateFingerprintWithSchedule(resolveWeeklyPplSchedule(settings));
  }
  return pplTemplateFingerprintWithSchedule(DEFAULT_WEEKLY_PPL_SCHEDULE);
}
