import {
  DEFAULT_WEEKLY_PPL_SCHEDULE,
  suggestWeeklyCardioFromPplSchedule,
} from "@/lib/pplWeekSchedule";
import {
  PPL_BALANCED_SHELLS,
  type PplDayType,
} from "@/lib/pplWeekTemplate";
import type { LayoutGroup } from "@/lib/weeklyCategoryLayout";
import {
  sanitizeWeekBlueprint,
  suggestWeekBlueprintFromCatalog,
  type WeekBlueprint,
} from "@/lib/weekBlueprint";

export type WeekBlueprintPresetId = "upper_lower" | "ppl_balanced";

export type WeekBlueprintPreset = {
  id: WeekBlueprintPresetId;
  label: string;
  description: string;
};

export const WEEK_BLUEPRINT_PRESETS: WeekBlueprintPreset[] = [
  {
    id: "upper_lower",
    label: "Upper / lower",
    description:
      "Alternating strength themes from the default catalog — good general template.",
  },
  {
    id: "ppl_balanced",
    label: "PPL (balanced)",
    description:
      "Classic push / pull / legs split with Sunday active recovery.",
  },
];

function groupsForPplRound(
  dayType: PplDayType,
  roundIndex: number,
  roundCount: number,
): LayoutGroup[] {
  switch (dayType) {
    case "push":
      return ["upper_push", "cardio"];
    case "pull":
      return ["upper_pull", "cardio"];
    case "legs":
      if (roundIndex < roundCount - 2) return ["lower"];
      if (roundIndex === roundCount - 2) {
        return ["lower", "core_front", "core_lower"];
      }
      return ["core_rotational", "core_stability"];
    case "active_recovery":
      return ["core_rotational", "core_stability"];
    default: {
      const _exhaustive: never = dayType;
      return _exhaustive;
    }
  }
}

/** Guided-style blueprint mirroring the balanced PPL calendar. */
export function buildPplBalancedWeekBlueprint(): WeekBlueprint {
  const cardioByDay = suggestWeeklyCardioFromPplSchedule(
    DEFAULT_WEEKLY_PPL_SCHEDULE,
  );
  const out: WeekBlueprint = {};

  for (const shell of PPL_BALANCED_SHELLS) {
    const dayKind =
      shell.dayType === "active_recovery" ? "active_recovery" : "workout";
    const rounds = Array.from({ length: shell.roundCount }, (_, roundIndex) => ({
      groups: groupsForPplRound(shell.dayType, roundIndex, shell.roundCount),
    }));

    out[shell.dayOfWeek] = {
      dayKind,
      rounds,
      cardio: cardioByDay[shell.dayOfWeek] ?? [],
    };
  }

  return sanitizeWeekBlueprint(out);
}

export function weekBlueprintForPreset(
  presetId: WeekBlueprintPresetId,
): WeekBlueprint {
  switch (presetId) {
    case "upper_lower":
      return suggestWeekBlueprintFromCatalog();
    case "ppl_balanced":
      return buildPplBalancedWeekBlueprint();
    default: {
      const _exhaustive: never = presetId;
      return _exhaustive;
    }
  }
}
