import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import { migrateAvailableEquipment } from "@/data/equipment";
import {
  sanitizeTrainingPriorityPreset,
  sanitizeTrainingPriorityScores,
  scoresEqual,
  scoresFromPreset,
  totalEmphasisScore,
} from "@/lib/trainingPriorities";
import {
  sanitizeWeeklyCardioByDay,
  suggestWeeklyCardioFromCatalog,
  weeklyCardioEqual,
} from "@/lib/cardioActivities";
import {
  DEFAULT_WEEKLY_PPL_SCHEDULE,
  mergeRestDaysIntoPplSchedule,
  sanitizeWeeklyPplSchedule,
  weeklyPplScheduleEqual,
} from "@/lib/pplWeekSchedule";
import {
  sanitizeWeeklyRestDays,
  weeklyRestDaysEqual,
} from "@/lib/restDays";
import {
  layoutEqual,
  sanitizeWeeklyCategoryLayout,
  suggestLayoutFromCatalog,
} from "@/lib/weeklyCategoryLayout";
import {
  sanitizeWeeklyLayoutDayStructure,
  suggestWeeklyLayoutDayStructure,
  weeklyLayoutDayStructureEqual,
} from "@/lib/weeklyLayoutDayStructure";
import {
  isLegacyLayoutProgramMode,
  sanitizeProgramMode as sanitizeProgramModeFromLayout,
} from "@/lib/weeklyCategoryLayout";
import {
  migrateLayoutToBlueprint,
  sanitizeCustomBuildStyle,
  sanitizeWeekBlueprint,
  suggestWeekBlueprintFromCatalog,
  weekBlueprintEqual,
} from "@/lib/weekBlueprint";
import {
  DEFAULT_EXPERTISE_BY_GROUP,
  sanitizeExpertiseByGroup,
} from "@/lib/expertiseLevels";
import {
  DEFAULT_COOL_DOWN_STRETCH_COUNT,
  DEFAULT_WARM_UP_STRETCH_COUNT,
  sanitizeStretchCount,
} from "@/lib/stretchCounts";
import type { UserSettings } from "@/types";

const EMPTY_RELEASE_NOTES_SEEN: string[] = [];

/** Merge partial settings and migrate legacy `programFocus` → `trainingPriorityPreset`. */
export function normalizeUserSettings(
  partial: Partial<UserSettings> = {},
): UserSettings {
  const preset = sanitizeTrainingPriorityPreset(
    partial.trainingPriorityPreset ?? partial.programFocus,
  );
  const { programFocus: _legacy, ...rest } = partial;

  const presetScores = scoresFromPreset(preset);
  let scores = partial.trainingPriorityScores
    ? sanitizeTrainingPriorityScores(partial.trainingPriorityScores, presetScores)
    : presetScores;

  const explicitCustomized = partial.trainingPriorityCustomized;
  const presetChanged =
    partial.trainingPriorityPreset != null || partial.programFocus != null;
  const customized =
    explicitCustomized ??
    (presetChanged && partial.trainingPriorityScores == null
      ? false
      : !scoresEqual(scores, presetScores));

  if (!customized && presetChanged) {
    scores = presetScores;
  }

  if (totalEmphasisScore(scores) === 0) {
    scores = scoresFromPreset("balanced");
  }

  const rawProgramMode = partial.programMode;
  const migratingFromLayout = isLegacyLayoutProgramMode(rawProgramMode);
  const programMode = sanitizeProgramModeFromLayout(rawProgramMode);
  const catalogLayout = suggestLayoutFromCatalog();
  const weeklyCategoryLayout = sanitizeWeeklyCategoryLayout(
    partial.weeklyCategoryLayout,
    catalogLayout,
  );
  const layoutCustomizedExplicit = partial.weeklyCategoryLayoutCustomized;
  const weeklyCategoryLayoutCustomized =
    layoutCustomizedExplicit ??
    (partial.weeklyCategoryLayout != null &&
      !layoutEqual(weeklyCategoryLayout, catalogLayout));

  const catalogStructure = suggestWeeklyLayoutDayStructure(catalogLayout);
  const weeklyLayoutDayStructure = sanitizeWeeklyLayoutDayStructure(
    partial.weeklyLayoutDayStructure,
    weeklyCategoryLayout,
  );
  const structureCustomizedExplicit =
    partial.weeklyLayoutDayStructureCustomized;
  const weeklyLayoutDayStructureCustomized =
    structureCustomizedExplicit ??
    (partial.weeklyLayoutDayStructure != null &&
      !weeklyLayoutDayStructureEqual(
        weeklyLayoutDayStructure,
        catalogStructure,
      ));

  const catalogCardio = suggestWeeklyCardioFromCatalog();
  const weeklyCardioByDay = sanitizeWeeklyCardioByDay(
    partial.weeklyCardioByDay,
    catalogCardio,
  );
  const weeklyCardioCustomized =
    partial.weeklyCardioCustomized ??
    (partial.weeklyCardioByDay != null &&
      !weeklyCardioEqual(weeklyCardioByDay, catalogCardio));

  const defaultRest = sanitizeWeeklyRestDays(undefined);
  const weeklyRestDays = sanitizeWeeklyRestDays(partial.weeklyRestDays);
  const weeklyRestDaysCustomized =
    partial.weeklyRestDaysCustomized ??
    (partial.weeklyRestDays != null &&
      !weeklyRestDaysEqual(weeklyRestDays, defaultRest));

  let weeklyPplSchedule = sanitizeWeeklyPplSchedule(
    partial.weeklyPplSchedule,
    DEFAULT_WEEKLY_PPL_SCHEDULE,
  );
  if (
    !partial.weeklyPplScheduleCustomized &&
    partial.weeklyPplSchedule == null &&
    partial.weeklyRestDaysCustomized
  ) {
    weeklyPplSchedule = mergeRestDaysIntoPplSchedule(weeklyRestDays);
  }
  const weeklyPplScheduleCustomized =
    partial.weeklyPplScheduleCustomized ??
    (partial.weeklyPplSchedule != null &&
      !weeklyPplScheduleEqual(weeklyPplSchedule, DEFAULT_WEEKLY_PPL_SCHEDULE));

  const expertiseByGroup = sanitizeExpertiseByGroup(
    partial.expertiseByGroup,
    DEFAULT_EXPERTISE_BY_GROUP,
  );

  const catalogBlueprint = suggestWeekBlueprintFromCatalog();
  let weekBlueprint = sanitizeWeekBlueprint(
    partial.weekBlueprint,
    catalogBlueprint,
  );
  if (
    migratingFromLayout &&
    partial.weekBlueprint == null &&
    !partial.weekBlueprintCustomized
  ) {
    weekBlueprint = migrateLayoutToBlueprint(
      weeklyCategoryLayout,
      weeklyLayoutDayStructure,
      weeklyCardioByDay,
    );
  }
  const weekBlueprintCustomized =
    partial.weekBlueprintCustomized ??
    (partial.weekBlueprint != null &&
      !weekBlueprintEqual(weekBlueprint, catalogBlueprint));

  let customBuildStyle = sanitizeCustomBuildStyle(
    partial.customBuildStyle ??
      (programMode === "custom" &&
      (partial.weekBlueprintCustomized === true || partial.weekBlueprint != null)
        ? "guided"
        : programMode === "custom" && !migratingFromLayout
          ? "manual"
          : "guided"),
  );
  if (migratingFromLayout && partial.customBuildStyle == null) {
    customBuildStyle = "guided";
  }

  const weekBuilderMigrationAcknowledged =
    partial.weekBuilderMigrationAcknowledged ??
    DEFAULT_SETTINGS.weekBuilderMigrationAcknowledged;

  const warmUpStretchCount = sanitizeStretchCount(
    partial.warmUpStretchCount,
    DEFAULT_WARM_UP_STRETCH_COUNT,
  );
  const coolDownStretchCount = sanitizeStretchCount(
    partial.coolDownStretchCount,
    DEFAULT_COOL_DOWN_STRETCH_COUNT,
  );

  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    availableEquipment: migrateAvailableEquipment(
      partial.availableEquipment ?? rest.availableEquipment,
    ),
    expertiseByGroup,
    equipmentOnboardingCompleted:
      partial.equipmentOnboardingCompleted ?? DEFAULT_SETTINGS.equipmentOnboardingCompleted,
    trainingPriorityPreset: preset,
    trainingPriorityScores: scores,
    trainingPriorityCustomized: customized,
    programMode,
    customBuildStyle,
    weekBlueprint,
    weekBlueprintCustomized,
    weekBuilderMigrationAcknowledged,
    warmUpStretchCount,
    coolDownStretchCount,
    weeklyCategoryLayout,
    weeklyCategoryLayoutCustomized,
    weeklyLayoutDayStructure,
    weeklyLayoutDayStructureCustomized,
    weeklyRestDays,
    weeklyRestDaysCustomized,
    weeklyPplSchedule,
    weeklyPplScheduleCustomized,
    weeklyCardioByDay,
    weeklyCardioCustomized,
    ...(partial.releaseNotesSeenIds !== undefined
      ? {
          releaseNotesSeenIds: sanitizeReleaseNotesSeenIds(
            partial.releaseNotesSeenIds,
          ),
        }
      : {}),
    suggestRepIncreases:
      partial.suggestRepIncreases ?? DEFAULT_SETTINGS.suggestRepIncreases,
  };
}

function sanitizeReleaseNotesSeenIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return EMPTY_RELEASE_NOTES_SEEN;
  const filtered = ids.filter(
    (id): id is string => typeof id === "string" && id.trim().length > 0,
  );
  return filtered.length === 0 ? EMPTY_RELEASE_NOTES_SEEN : filtered;
}
