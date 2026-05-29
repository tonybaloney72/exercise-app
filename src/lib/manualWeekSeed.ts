import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import { buildVarietySeed } from "@/lib/planVariety";
import { buildProgramProfileInput } from "@/lib/programProfile";
import { buildWeekSeedFromSettings } from "@/lib/weekSeed";
import {
  sanitizeWeekBlueprint,
  suggestWeekBlueprintFromCatalog,
  type WeekBlueprint,
} from "@/lib/weekBlueprint";
import {
  weekBlueprintForPreset,
  type WeekBlueprintPresetId,
} from "@/lib/weekBlueprintPresets";
import { scoresFromPreset } from "@/lib/trainingPriorities";
import {
  getExercisePreferenceRepo,
  getExerciseSettingsRepo,
  getSettingsRepo,
  type TrainingWeekDays,
} from "@/lib/repos";
import type { DayPlan } from "@/types";

function blueprintMaterializeProfile(blueprint: WeekBlueprint) {
  return buildProgramProfileInput("balanced", scoresFromPreset("balanced"), false, {
    blueprintMode: true,
    weekBlueprint: blueprint,
  });
}

/** Materialize a full Sun–Sat week from a blueprint (filled exercises). */
export async function buildWeekPlansFromBlueprint(
  blueprint: WeekBlueprint,
  weekKey: string,
): Promise<TrainingWeekDays> {
  const [prefs, settings, exerciseSettings] = await Promise.all([
    getExercisePreferenceRepo("authenticated").loadAll(),
    getSettingsRepo("authenticated").load(),
    getExerciseSettingsRepo("authenticated").loadAll(),
  ]);

  const availableEquipment =
    settings.availableEquipment?.length > 0
      ? settings.availableEquipment
      : [...DEFAULT_AVAILABLE_EQUIPMENT];
  const roundDensity = settings.roundDensity ?? "standard";
  const seedSettings = {
    ...settings,
    weekBlueprint: blueprint,
    weekBlueprintCustomized: true,
  };

  const profile = blueprintMaterializeProfile(blueprint);
  const generated = materializeTrainingWeek(
    buildWeekSeedFromSettings(seedSettings),
    prefs,
    availableEquipment,
    "balanced",
    roundDensity,
    exerciseSettings,
    buildVarietySeed(weekKey, "authenticated"),
    profile,
    seedSettings,
  );

  const out: TrainingWeekDays = {};
  for (let dow = 0; dow < 7; dow++) {
    const day = generated[dow];
    if (!day) continue;
    out[dow] = { ...day, dayOfWeek: dow };
  }
  return out;
}

/** Materialize one day from a blueprint (caller may run prepareDayPlanForEditor). */
export async function buildDayPlanFromBlueprint(
  dayOfWeek: number,
  blueprint: WeekBlueprint,
  weekKey: string,
): Promise<DayPlan> {
  const week = await buildWeekPlansFromBlueprint(blueprint, weekKey);
  const day = week[dayOfWeek];
  if (!day) {
    throw new Error(`No plan for dayOfWeek ${dayOfWeek}`);
  }
  return day;
}

/** Saved guided blueprint, preset, or catalog default — for manual week seed. */
export function resolveBlueprintForManualSeed(
  settings: {
    weekBlueprint?: WeekBlueprint;
    weekBlueprintCustomized?: boolean;
  },
  presetId?: WeekBlueprintPresetId,
): WeekBlueprint {
  if (presetId) {
    return weekBlueprintForPreset(presetId);
  }
  if (settings.weekBlueprintCustomized && settings.weekBlueprint) {
    return sanitizeWeekBlueprint(settings.weekBlueprint);
  }
  return suggestWeekBlueprintFromCatalog();
}
