import type { ExerciseCategory } from "@/types";

/** Bump when Balanced shells or finisher defaults change (week fingerprint / migration). */
export const PPL_TEMPLATE_VERSION = "ppl-2026-05-v4";

export type PplDayType = "active_recovery" | "push" | "pull" | "legs";

/** Core categories used on leg days (abs / core work - not on push or pull). */
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
