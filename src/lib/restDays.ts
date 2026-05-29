import { isPresetProgramMode } from "@/lib/weekSeed";
import {
  pplScheduleToRestDayMode,
  resolveWeeklyPplSchedule,
} from "@/lib/pplWeekSchedule";
import type { DayPlan, RestDayMode, UserSettings, WeeklyRestDays } from "@/types";

export const REST_DAY_LABELS: Record<RestDayMode, string> = {
  workout: "Workout",
  active_recovery: "Active recovery",
  stretches: "Stretches only",
  full_rest: "Full rest",
};

export const REST_DAY_DESCRIPTIONS: Record<RestDayMode, string> = {
  workout: "Normal plan for this weekday (strength rounds + stretches + any cardio you enabled).",
  active_recovery:
    "One light core-focused round plus stretches; optional cardio. Not a full training day.",
  stretches: "Warm-up and cool-down only — no exercise rounds.",
  full_rest: "Nothing scheduled — no stretches, rounds, or cardio to log.",
};

/** Defaults: Sunday active recovery; other days follow the normal week. */
export const DEFAULT_WEEKLY_REST_DAYS: WeeklyRestDays = {
  0: "active_recovery",
  1: "workout",
  2: "workout",
  3: "workout",
  4: "workout",
  5: "workout",
  6: "workout",
};

const LEGACY_MODE_MAP: Record<string, RestDayMode> = {
  off: "workout",
  light: "stretches",
  full: "full_rest",
};

export function sanitizeRestDayMode(raw: unknown): RestDayMode {
  if (typeof raw === "string" && raw in REST_DAY_LABELS) {
    return raw as RestDayMode;
  }
  if (typeof raw === "string" && raw in LEGACY_MODE_MAP) {
    return LEGACY_MODE_MAP[raw]!;
  }
  return "workout";
}

export function sanitizeWeeklyRestDays(raw: unknown): WeeklyRestDays {
  const out: WeeklyRestDays = { ...DEFAULT_WEEKLY_REST_DAYS };
  if (!raw || typeof raw !== "object") return out;
  for (let dow = 0; dow < 7; dow++) {
    const v = (raw as Record<string, unknown>)[String(dow)];
    if (v != null) {
      out[dow] = sanitizeRestDayMode(v);
    }
  }
  return out;
}

export function weeklyRestDaysEqual(a: WeeklyRestDays, b: WeeklyRestDays): boolean {
  for (let dow = 0; dow < 7; dow++) {
    if ((a[dow] ?? "workout") !== (b[dow] ?? "workout")) return false;
  }
  return true;
}

export function weeklyRestDaysFingerprint(days: WeeklyRestDays): string {
  const seg = [0, 1, 2, 3, 4, 5, 6]
    .map((dow) => `${dow}:${days[dow] ?? "workout"}`)
    .join("|");
  return `wrd:${seg}`;
}

/** Effective mode for a weekday (defaults apply even before the user edits rest days). */
export function resolveRestDayMode(
  dayOfWeek: number,
  settings: Pick<
    UserSettings,
    | "programMode"
    | "weeklyRestDays"
    | "weeklyRestDaysCustomized"
    | "weeklyPplSchedule"
    | "weeklyPplScheduleCustomized"
  >,
): RestDayMode {
  if (isPresetProgramMode(settings.programMode)) {
    const schedule = resolveWeeklyPplSchedule(settings as UserSettings);
    const entry = schedule[dayOfWeek] ?? "full_rest";
    return pplScheduleToRestDayMode(entry);
  }
  if (settings.programMode === "custom") {
    return "workout";
  }
  if (settings.weeklyRestDaysCustomized && settings.weeklyRestDays) {
    return sanitizeRestDayMode(settings.weeklyRestDays[dayOfWeek]);
  }
  return DEFAULT_WEEKLY_REST_DAYS[dayOfWeek] ?? "workout";
}

/** Light session template (catalog-style active recovery). */
export function activeRecoveryDayPlan(base: DayPlan): DayPlan {
  return {
    ...base,
    restDayMode: "active_recovery",
    theme: "Active Recovery",
    strengthFocus: [],
    coreGroups: ["CS"],
    rounds: [{ roundNumber: 1, exercises: [] }],
  };
}

export function applyRestDayToPlan(plan: DayPlan, mode: RestDayMode): DayPlan {
  switch (mode) {
    case "workout":
      return { ...plan, restDayMode: "workout" };
    case "active_recovery":
      return activeRecoveryDayPlan(plan);
    case "stretches":
      return {
        ...plan,
        restDayMode: "stretches",
        strengthFocus: [],
        coreGroups: [],
        hasJog: false,
        rounds: [],
      };
    case "full_rest":
      return {
        ...plan,
        restDayMode: "full_rest",
        strengthFocus: [],
        coreGroups: [],
        hasJog: false,
        rounds: [],
      };
  }
}

export function isStretchOnlyRestDay(plan: DayPlan): boolean {
  return plan.restDayMode === "stretches";
}

export function isFullRestDay(plan: DayPlan): boolean {
  return plan.restDayMode === "full_rest";
}

/** Full rest or stretches-only — user may still add optional work via the editor. */
export function isOptionalRestDay(plan: DayPlan): boolean {
  return plan.restDayMode === "full_rest" || plan.restDayMode === "stretches";
}

/** True when any round still has prescribed strength slots. */
export function planHasStrengthExercises(plan: DayPlan): boolean {
  return plan.rounds.some((round) => round.exercises.length > 0);
}

/**
 * Drop empty round shells on rest days (legacy weeks stored a blank Round 1).
 * Keeps rounds when the user added exercises via customize.
 */
export function stripPhantomRestDayRounds(plan: DayPlan): DayPlan {
  if (!isOptionalRestDay(plan)) return plan;
  if (planHasStrengthExercises(plan)) return plan;
  if (plan.rounds.length === 0) return plan;

  const cleared: DayPlan = {
    ...plan,
    rounds: [],
  };
  if (plan.restDayMode === "full_rest") {
    return {
      ...cleared,
      strengthFocus: [],
      coreGroups: [],
      hasJog: false,
      cardioActivities: [],
    };
  }
  return {
    ...cleared,
    strengthFocus: [],
    coreGroups: [],
    hasJog: false,
  };
}

export function shouldSkipStretchesForPlan(plan: DayPlan): boolean {
  return plan.restDayMode === "full_rest";
}

export function isActiveRecoveryDay(plan: DayPlan): boolean {
  return plan.restDayMode === "active_recovery";
}
