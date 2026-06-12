/**
 * Per-weekday P/P/L schedule (preset mode): training focus + rest in one map.
 */
import type {
  CardioActivityKind,
  DayPlan,
  PplDaySchedule,
  RestDayMode,
  WeeklyPplSchedule,
} from "@/types";
import {
  coreGroupsForPplDayType,
  PPL_TEMPLATE_VERSION,
  strengthFocusForPplDayType,
  type PplDayShell,
  type PplDayType,
} from "@/lib/pplWeekTypes";
import type { UserSettings } from "@/types";

export const PPL_SCHEDULE_LABELS: Record<PplDaySchedule, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  active_recovery: "Active recovery",
  stretches: "Stretches only",
  full_rest: "Full rest",
};

export const PPL_SCHEDULE_ORDER: PplDaySchedule[] = [
  "push",
  "pull",
  "legs",
  "active_recovery",
  "stretches",
  "full_rest",
];

/** Classic 6-day PPL + Sunday recovery. */
export const DEFAULT_WEEKLY_PPL_SCHEDULE: WeeklyPplSchedule = {
  0: "active_recovery",
  1: "push",
  2: "pull",
  3: "legs",
  4: "push",
  5: "pull",
  6: "legs",
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function sanitizePplDaySchedule(raw: unknown): PplDaySchedule {
  if (typeof raw === "string" && raw in PPL_SCHEDULE_LABELS) {
    return raw as PplDaySchedule;
  }
  return "full_rest";
}

export function sanitizeWeeklyPplSchedule(
  raw: unknown,
  fallback: WeeklyPplSchedule = DEFAULT_WEEKLY_PPL_SCHEDULE,
): WeeklyPplSchedule {
  const out: WeeklyPplSchedule = { ...fallback };
  if (!raw || typeof raw !== "object") return out;
  for (let dow = 0; dow < 7; dow++) {
    const v = (raw as Record<string, unknown>)[String(dow)];
    if (v != null) out[dow] = sanitizePplDaySchedule(v);
  }
  return out;
}

export function weeklyPplScheduleEqual(
  a: WeeklyPplSchedule,
  b: WeeklyPplSchedule,
): boolean {
  for (let dow = 0; dow < 7; dow++) {
    if (
      (a[dow] ?? DEFAULT_WEEKLY_PPL_SCHEDULE[dow]) !==
      (b[dow] ?? DEFAULT_WEEKLY_PPL_SCHEDULE[dow])
    ) {
      return false;
    }
  }
  return true;
}

/** Merge legacy rest-day settings into a PPL schedule (workout → keep focus). */
export function mergeRestDaysIntoPplSchedule(
  restDays: UserSettings["weeklyRestDays"],
  base: WeeklyPplSchedule = DEFAULT_WEEKLY_PPL_SCHEDULE,
): WeeklyPplSchedule {
  const out: WeeklyPplSchedule = { ...base };
  for (let dow = 0; dow < 7; dow++) {
    const mode = restDays[dow] ?? "workout";
    if (mode === "full_rest") out[dow] = "full_rest";
    else if (mode === "stretches") out[dow] = "stretches";
    else if (mode === "active_recovery") out[dow] = "active_recovery";
  }
  return out;
}

export function resolveWeeklyPplSchedule(
  settings: UserSettings,
): WeeklyPplSchedule {
  if (!settings.weeklyPplScheduleCustomized) {
    if (settings.weeklyRestDaysCustomized) {
      return mergeRestDaysIntoPplSchedule(settings.weeklyRestDays);
    }
    return { ...DEFAULT_WEEKLY_PPL_SCHEDULE };
  }
  return sanitizeWeeklyPplSchedule(settings.weeklyPplSchedule);
}

export function pplScheduleToRestDayMode(entry: PplDaySchedule): RestDayMode {
  switch (entry) {
    case "push":
    case "pull":
    case "legs":
      return "workout";
    case "active_recovery":
      return "active_recovery";
    case "stretches":
      return "stretches";
    case "full_rest":
      return "full_rest";
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}

function pplScheduleHasCardioFinisher(entry: PplDaySchedule): boolean {
  return entry === "push" || entry === "pull" || entry === "active_recovery";
}

function pplScheduleToMaterializerType(
  entry: PplDaySchedule,
): PplDayType | null {
  switch (entry) {
    case "push":
    case "pull":
    case "legs":
      return entry;
    case "active_recovery":
      return "active_recovery";
    case "stretches":
    case "full_rest":
      return null;
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}

export function inferPplDayTypeFromSeed(plan: DayPlan): PplDayType | null {
  if (plan.restDayMode === "full_rest" || plan.restDayMode === "stretches") {
    return null;
  }
  if (plan.restDayMode === "active_recovery") return "active_recovery";
  if (plan.strengthFocus.includes("LB")) return "legs";
  if (plan.strengthFocus.includes("UPL")) return "pull";
  if (plan.strengthFocus.includes("UP")) return "push";
  if (plan.coreGroups.length > 0 && plan.strengthFocus.length === 0) {
    return "active_recovery";
  }
  return null;
}

function roundCountForSchedule(entry: PplDaySchedule): number {
  switch (entry) {
    case "push":
    case "pull":
      return 3;
    case "legs":
      return 4;
    case "active_recovery":
      return 1;
    case "stretches":
    case "full_rest":
      return 0;
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}

function themeForSchedule(entry: PplDaySchedule): string {
  switch (entry) {
    case "push":
      return "Push - upper push + cardio finisher";
    case "pull":
      return "Pull - upper pull + cardio finisher";
    case "legs":
      return "Legs - lower body + core block";
    case "active_recovery":
      return "Active recovery - light core + cardio";
    case "stretches":
      return "Stretches only";
    case "full_rest":
      return "Full rest";
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}

function buildPplShellFromSchedule(
  dayOfWeek: number,
  entry: PplDaySchedule,
): PplDayShell {
  const materializerType = pplScheduleToMaterializerType(entry);
  const dayType: PplDayType = materializerType ?? "active_recovery";
  return {
    dayOfWeek,
    name: DAY_NAMES[dayOfWeek]!,
    theme: themeForSchedule(entry),
    dayType,
    roundCount: roundCountForSchedule(entry),
    hasCardioFinisher: pplScheduleHasCardioFinisher(entry),
  };
}

export function buildPplDayPlanFromSchedule(
  dayOfWeek: number,
  schedule: WeeklyPplSchedule,
): DayPlan {
  const entry =
    schedule[dayOfWeek] ??
    DEFAULT_WEEKLY_PPL_SCHEDULE[dayOfWeek] ??
    "full_rest";
  const shell = buildPplShellFromSchedule(dayOfWeek, entry);
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

export function pplWeeklyCardioEligibleDaysFromSchedule(
  schedule: WeeklyPplSchedule,
): number[] {
  const out: number[] = [];
  for (let dow = 0; dow < 7; dow++) {
    const entry = schedule[dow] ?? DEFAULT_WEEKLY_PPL_SCHEDULE[dow];
    if (entry && pplScheduleHasCardioFinisher(entry)) out.push(dow);
  }
  return out;
}

export function suggestWeeklyCardioFromPplSchedule(
  schedule: WeeklyPplSchedule = DEFAULT_WEEKLY_PPL_SCHEDULE,
): Record<number, CardioActivityKind[]> {
  const out: Record<number, CardioActivityKind[]> = {};
  for (let dow = 0; dow < 7; dow++) {
    const entry = schedule[dow] ?? DEFAULT_WEEKLY_PPL_SCHEDULE[dow];
    out[dow] = entry && pplScheduleHasCardioFinisher(entry) ? ["jog"] : [];
  }
  return out;
}

export function sanitizePplWeeklyCardioByDayForSchedule(
  byDay: Record<number, CardioActivityKind[]>,
  schedule: WeeklyPplSchedule,
): Record<number, CardioActivityKind[]> {
  const eligible = new Set(pplWeeklyCardioEligibleDaysFromSchedule(schedule));
  const out: Record<number, CardioActivityKind[]> = {};
  for (let dow = 0; dow < 7; dow++) {
    out[dow] = eligible.has(dow) ? [...(byDay[dow] ?? [])] : [];
  }
  return out;
}

function weeklyPplScheduleFingerprint(schedule: WeeklyPplSchedule): string {
  const seg = [0, 1, 2, 3, 4, 5, 6]
    .map((d) => `${d}:${schedule[d] ?? DEFAULT_WEEKLY_PPL_SCHEDULE[d]}`)
    .join(",");
  return `pplSched:${seg}`;
}

export function pplTemplateFingerprintWithSchedule(
  schedule: WeeklyPplSchedule,
): string {
  return `${pplTemplateFingerprintBase()}:${weeklyPplScheduleFingerprint(schedule)}`;
}

function pplTemplateFingerprintBase(): string {
  return `ppl:${PPL_TEMPLATE_VERSION}:balanced`;
}

/** Preset: classic Mon–Sat PPL + Sun recovery. */
export function classicWeeklyPplSchedule(): WeeklyPplSchedule {
  return { ...DEFAULT_WEEKLY_PPL_SCHEDULE };
}

/** Preset: Mon/Wed/Fri workout, others rest (3-day style). */
export function threeDayPplSchedule(): WeeklyPplSchedule {
  return {
    0: "full_rest",
    1: "push",
    2: "full_rest",
    3: "pull",
    4: "full_rest",
    5: "legs",
    6: "full_rest",
  };
}

export type PplSchedulePresetId = "classic" | "three_day" | "custom";

/** Which built-in weekday template matches the current schedule (if any). */
export function detectPplSchedulePreset(
  schedule: WeeklyPplSchedule,
): PplSchedulePresetId {
  if (weeklyPplScheduleEqual(schedule, classicWeeklyPplSchedule())) {
    return "classic";
  }
  if (weeklyPplScheduleEqual(schedule, threeDayPplSchedule())) {
    return "three_day";
  }
  return "custom";
}
