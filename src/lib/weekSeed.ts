import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { buildPplWeek } from "@/lib/pplWeekTemplate";
import type { TrainingWeekDays } from "@/lib/repos";
import { sanitizeProgramMode, type ProgramMode } from "@/lib/weeklyCategoryLayout";
import type { UserSettings } from "@/types";

/** Preset mode — 6-day P/P/L week seed. */
export function isPresetProgramMode(mode: ProgramMode | undefined): boolean {
  return sanitizeProgramMode(mode) === "preset";
}

/** @deprecated Use {@link isPresetProgramMode}. */
export const isPrioritiesProgramMode = isPresetProgramMode;

/** Sun–Sat theme shells before rest/cardio + generator fill. */
export function buildWeekSeedForProgramMode(
  mode: ProgramMode | undefined,
): TrainingWeekDays {
  return isPresetProgramMode(mode) ? buildPplWeek("balanced") : buildCatalogWeek();
}

export function buildWeekSeedFromSettings(
  settings: UserSettings,
): TrainingWeekDays {
  if (isPresetProgramMode(settings.programMode)) {
    return buildPplWeek(settings);
  }
  return buildCatalogWeek();
}
