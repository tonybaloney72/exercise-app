import type { AuthMode } from "@/stores/useAuthStore";

/** Settings inputs that change resolved week content (excludes plan revision bumps). */
export function buildTrainingWeekDepsKey(input: {
  mode: AuthMode;
  equipmentKey: string;
  programProfileKey: string;
  stretchDefaultsKey: string;
}): string {
  return [
    input.mode,
    input.equipmentKey,
    input.programProfileKey,
    input.stretchDefaultsKey,
  ].join("|");
}
