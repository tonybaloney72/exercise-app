import { exerciseMap } from "@/core/catalog";
import type { RepIncreaseSuggestion } from "@/lib/repIncreaseSuggestions";
import type { ExerciseSettingsValues } from "@/types";
import { resolveExerciseSettings } from "@/utils/effectiveExerciseSettings";

export function buildExerciseSettingsAfterRepIncreaseAccept(
  _exerciseId: string,
  suggestion: RepIncreaseSuggestion,
  stored: ExerciseSettingsValues | undefined,
  todayKey: string,
): ExerciseSettingsValues {
  if (suggestion.mode === "timer") {
    return {
      ...stored,
      defaultSetMode: "timer",
      defaultTargetReps: null,
      defaultTimerSeconds: suggestion.suggestedTarget,
      defaultWeightLb: stored?.defaultWeightLb ?? null,
      repSuggestionLastAcceptedAt: todayKey,
      repSuggestionSnoozedUntil: null,
    };
  }

  if (suggestion.mode === "load") {
    return {
      ...stored,
      defaultSetMode: "reps",
      defaultTimerSeconds: null,
      defaultTargetReps: suggestion.suggestedTarget,
      defaultWeightLb: suggestion.suggestedWeightLb ?? null,
      repSuggestionLastAcceptedAt: todayKey,
      repSuggestionSnoozedUntil: null,
    };
  }

  return {
    ...stored,
    defaultSetMode: "reps",
    defaultTimerSeconds: null,
    defaultTargetReps: suggestion.suggestedTarget,
    defaultWeightLb: stored?.defaultWeightLb ?? null,
    repSuggestionLastAcceptedAt: todayKey,
    repSuggestionSnoozedUntil: null,
  };
}

export function buildExerciseSettingsAfterRepIncreaseSnooze(
  exerciseId: string,
  stored: ExerciseSettingsValues | undefined,
  snoozedUntil: string,
): ExerciseSettingsValues {
  const meta = exerciseMap[exerciseId];
  const resolved = meta
    ? resolveExerciseSettings(meta, stored)
    : { defaultSetMode: "reps" as const };
  return {
    ...stored,
    defaultSetMode: resolved.defaultSetMode,
    repSuggestionSnoozedUntil: snoozedUntil,
  };
}

export function buildExerciseSettingsAfterRepIncreaseIgnore(
  exerciseId: string,
  stored: ExerciseSettingsValues | undefined,
): ExerciseSettingsValues {
  const meta = exerciseMap[exerciseId];
  const resolved = meta
    ? resolveExerciseSettings(meta, stored)
    : { defaultSetMode: "reps" as const };
  return {
    ...stored,
    defaultSetMode: resolved.defaultSetMode,
    repSuggestionIgnored: true,
    repSuggestionSnoozedUntil: null,
  };
}

export function buildExerciseSettingsClearRepSuggestionIgnore(
  exerciseId: string,
  stored: ExerciseSettingsValues | undefined,
): ExerciseSettingsValues {
  const meta = exerciseMap[exerciseId];
  const resolved = meta
    ? resolveExerciseSettings(meta, stored)
    : { defaultSetMode: "reps" as const };
  return {
    ...stored,
    defaultSetMode: resolved.defaultSetMode,
    repSuggestionIgnored: false,
  };
}
