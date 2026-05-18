import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import {
  sanitizeTrainingPriorityPreset,
  sanitizeTrainingPriorityScores,
  scoresEqual,
  scoresFromPreset,
  totalEmphasisScore,
} from "@/lib/trainingPriorities";
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

  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    trainingPriorityPreset: preset,
    trainingPriorityScores: scores,
    trainingPriorityCustomized: customized,
    programMode,
    weeklyCategoryLayout,
    weeklyCategoryLayoutCustomized,
  };
}
