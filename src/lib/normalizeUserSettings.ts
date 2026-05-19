import { DEFAULT_SETTINGS } from "@/lib/repos/types";
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
  sanitizeWeeklyRestDays,
  weeklyRestDaysEqual,
} from "@/lib/restDays";
import {
  layoutEqual,
  sanitizeProgramMode,
  sanitizeWeeklyCategoryLayout,
  suggestLayoutFromCatalog,
} from "@/lib/weeklyCategoryLayout";
import type { UserSettings } from "@/types";

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

  const programMode = sanitizeProgramMode(partial.programMode);
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

  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    trainingPriorityPreset: preset,
    trainingPriorityScores: scores,
    trainingPriorityCustomized: customized,
    programMode,
    weeklyCategoryLayout,
    weeklyCategoryLayoutCustomized,
    weeklyRestDays,
    weeklyRestDaysCustomized,
    weeklyCardioByDay,
    weeklyCardioCustomized,
  };
}
