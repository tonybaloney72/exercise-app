import { TRAINING_WEEK_CATALOG } from "@/data/trainingWeekCatalog";
import {
  EMPHASIS_GROUP_ORDER,
  GROUP_TO_CATEGORIES,
  emphasisGroupForCategory,
  type EmphasisGroup,
} from "@/lib/trainingPriorities";
import type { DayPlan, ExerciseCategory } from "@/types";

/** Sun (0) … Sat (6) → enabled emphasis groups that day. */
export type WeeklyCategoryLayout = Record<number, EmphasisGroup[]>;

export type ProgramMode = "priorities" | "layout" | "custom";

export const PROGRAM_MODE_LABELS: Record<
  ProgramMode,
  { label: string; description: string }
> = {
  priorities: {
    label: "Priorities",
    description:
      "Preset or custom scores tilt the mix within each catalog-themed day.",
  },
  layout: {
    label: "Weekly layout",
    description:
      "Choose which groups run each day; we pick exercises inside those groups.",
  },
  custom: {
    label: "Custom week",
    description:
      "Build each day yourself on Weekly (full week builder coming soon).",
  },
};

export function sanitizeProgramMode(raw: unknown): ProgramMode {
  if (raw === "layout" || raw === "custom" || raw === "priorities") {
    return raw;
  }
  return "priorities";
}

/** Groups implied by catalog `strengthFocus` / `coreGroups` / jog. */
export function groupsForCatalogDay(plan: DayPlan): EmphasisGroup[] {
  const found = new Set<EmphasisGroup>();
  for (const cat of [...plan.strengthFocus, ...plan.coreGroups]) {
    const group = emphasisGroupForCategory(cat);
    if (group) found.add(group);
  }
  const hasPc =
    plan.hasJog ||
    plan.strengthFocus.includes("PC") ||
    plan.coreGroups.includes("PC");
  if (hasPc) found.add("cardio");
  return EMPHASIS_GROUP_ORDER.filter((g) => found.has(g));
}

export function suggestLayoutFromCatalog(): WeeklyCategoryLayout {
  const out: WeeklyCategoryLayout = {};
  for (const plan of TRAINING_WEEK_CATALOG) {
    out[plan.dayOfWeek] = groupsForCatalogDay(plan);
  }
  return out;
}

export function sanitizeWeeklyCategoryLayout(
  raw: unknown,
  fallback: WeeklyCategoryLayout = suggestLayoutFromCatalog(),
): WeeklyCategoryLayout {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const out: WeeklyCategoryLayout = {};
  for (let dow = 0; dow < 7; dow++) {
    const dayRaw = (raw as Record<string, unknown>)[String(dow)];
    if (!Array.isArray(dayRaw)) {
      out[dow] = [...(fallback[dow] ?? [])];
      continue;
    }
    const groups: EmphasisGroup[] = [];
    for (const item of dayRaw) {
      if (
        typeof item === "string" &&
        (EMPHASIS_GROUP_ORDER as string[]).includes(item) &&
        !groups.includes(item as EmphasisGroup)
      ) {
        groups.push(item as EmphasisGroup);
      }
    }
    out[dow] = groups;
  }
  return out;
}

export function layoutEqual(
  a: WeeklyCategoryLayout,
  b: WeeklyCategoryLayout,
): boolean {
  for (let dow = 0; dow < 7; dow++) {
    const ga = [...(a[dow] ?? [])].sort().join(",");
    const gb = [...(b[dow] ?? [])].sort().join(",");
    if (ga !== gb) return false;
  }
  return true;
}

export function resolveWeeklyCategoryLayout(settings: {
  weeklyCategoryLayout?: WeeklyCategoryLayout;
  weeklyCategoryLayoutCustomized?: boolean;
}): WeeklyCategoryLayout {
  if (settings.weeklyCategoryLayoutCustomized && settings.weeklyCategoryLayout) {
    return settings.weeklyCategoryLayout;
  }
  return suggestLayoutFromCatalog();
}

/** Map enabled groups for a day to exercise categories (respects jog only when cardio on). */
export function categoriesForDayLayout(
  plan: DayPlan,
  groups: EmphasisGroup[],
): ExerciseCategory[] {
  if (groups.length === 0) return [];
  const out: ExerciseCategory[] = [];
  for (const group of groups) {
    for (const cat of GROUP_TO_CATEGORIES[group]) {
      if (cat === "PC" && !plan.hasJog && group === "cardio") continue;
      if (!out.includes(cat)) out.push(cat);
    }
  }
  return out;
}

export function weeklyCategoryLayoutFingerprint(
  layout: WeeklyCategoryLayout,
): string {
  const seg = [0, 1, 2, 3, 4, 5, 6]
    .map((dow) => {
      const groups = layout[dow] ?? [];
      return `${dow}:${groups.join("+") || "-"}`;
    })
    .join("|");
  return `wcl:${seg}`;
}

export function describeDayLayout(groups: EmphasisGroup[]): string {
  if (groups.length === 0) return "Rest — no generated exercises";
  return groups
    .map((g) => {
      const labels: Record<EmphasisGroup, string> = {
        core: "Core",
        cardio: "Cardio",
        lower: "Lower",
        upper_push: "Push",
        upper_pull: "Pull",
      };
      return labels[g];
    })
    .join(" · ");
}
