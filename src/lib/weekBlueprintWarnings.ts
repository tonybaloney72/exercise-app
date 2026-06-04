import { LAYOUT_GROUP_LABELS } from "@/lib/weeklyCategoryLayout";
import type { LayoutGroup } from "@/lib/weeklyCategoryLayout";
import type { DayBlueprintKind, WeekBlueprint } from "@/lib/weekBlueprint";

export type WeekBlueprintWarning = {
  id: string;
  message: string;
  dayOfWeek?: number;
};

const LIGHT_DAY_KINDS = new Set<DayBlueprintKind>([
  "active_recovery",
  "stretches",
  "full_rest",
]);

const SKEW_GROUPS: { key: LayoutGroup; label: string }[] = [
  { key: "upper_push", label: "push" },
  { key: "upper_pull", label: "pull" },
  { key: "lower", label: "lower" },
];

/** Non-blocking hints while editing a guided week blueprint. */
export function analyzeWeekBlueprint(
  blueprint: WeekBlueprint,
): WeekBlueprintWarning[] {
  const warnings: WeekBlueprintWarning[] = [];
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let hasLightDay = false;
  const groupHits: Record<LayoutGroup, number> = {
    core_front: 0,
    core_lower: 0,
    core_rotational: 0,
    core_stability: 0,
    cardio: 0,
    lower: 0,
    upper_push: 0,
    upper_pull: 0,
  };

  for (let dow = 0; dow < 7; dow++) {
    const day = blueprint[dow];
    if (!day) continue;

    if (LIGHT_DAY_KINDS.has(day.dayKind)) {
      hasLightDay = true;
    }

    if (day.dayKind === "workout" || day.dayKind === "active_recovery") {
      if (day.rounds.length === 0) {
        warnings.push({
          id: `no-rounds-${dow}`,
          dayOfWeek: dow,
          message: `${DAY_NAMES[dow]} is a ${day.dayKind === "active_recovery" ? "light" : "workout"} day but has no rounds.`,
        });
      }

      day.rounds.forEach((round, ri) => {
        if (round.groups.length === 0) {
          warnings.push({
            id: `empty-round-${dow}-${ri}`,
            dayOfWeek: dow,
            message: `${DAY_NAMES[dow]} round ${ri + 1} has no muscle groups selected.`,
          });
        }
        for (const g of round.groups) {
          groupHits[g] += 1;
        }
      });
    }
  }

  if (!hasLightDay) {
    warnings.push({
      id: "no-light-day",
      message:
        "No rest or light day this week — consider active recovery, stretches only, or full rest on at least one day.",
    });
  }

  const skewCounts = SKEW_GROUPS.map(({ key, label }) => ({
    label,
    count: groupHits[key],
  }));
  const skewMax = Math.max(...skewCounts.map((g) => g.count));
  const skewPresent = skewCounts.filter((g) => g.count > 0);

  if (skewMax >= 3 && skewPresent.length >= 1) {
    const missing = SKEW_GROUPS.filter(({ key }) => groupHits[key] === 0)
      .map(({ label }) => label)
      .join(", ");
    if (missing) {
      const heaviest = skewCounts.find((g) => g.count === skewMax)?.label;
      warnings.push({
        id: "skew-emphasis",
        message: `Looks ${heaviest}-heavy this week — no ${missing} rounds scheduled. Fine if intentional.`,
      });
    }
  }

  const coreTotal =
    groupHits.core_front +
    groupHits.core_lower +
    groupHits.core_rotational +
    groupHits.core_stability;
  const workoutDayCount = [0, 1, 2, 3, 4, 5, 6].filter((dow) => {
    const k = blueprint[dow]?.dayKind;
    return k === "workout" || k === "active_recovery";
  }).length;

  if (workoutDayCount >= 4 && coreTotal === 0) {
    warnings.push({
      id: "no-core",
      message:
        "No core groups on any round this week — add a core pill if you want midsection work.",
    });
  }

  return warnings;
}

export function warningsForDay(
  warnings: WeekBlueprintWarning[],
  dayOfWeek: number,
): WeekBlueprintWarning[] {
  return warnings.filter((w) => w.dayOfWeek === dayOfWeek);
}

function formatGroupList(groups: LayoutGroup[]): string {
  return groups.map((g) => LAYOUT_GROUP_LABELS[g]).join(", ") || "None";
}
