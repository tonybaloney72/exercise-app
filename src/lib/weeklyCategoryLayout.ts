import { CATEGORIES } from "@/data/categories";
import { planHasJog } from "@/lib/cardioActivities";
import { TRAINING_WEEK_CATALOG } from "@/data/trainingWeekCatalog";
import type { DayPlan, ExerciseCategory } from "@/types";

/** Per-day allowlist for Weekly layout mode (finer than training-priority `EmphasisGroup`). */
export type LayoutGroup =
  | "core_front"
  | "core_lower"
  | "core_rotational"
  | "core_stability"
  | "cardio"
  | "lower"
  | "upper_push"
  | "upper_pull";

export const LAYOUT_GROUP_ORDER: LayoutGroup[] = [
  "core_front",
  "core_lower",
  "core_rotational",
  "core_stability",
  "cardio",
  "lower",
  "upper_push",
  "upper_pull",
];

export const LAYOUT_GROUP_LABELS: Record<LayoutGroup, string> = {
  core_front: CATEGORIES.CF.shortName,
  core_lower: CATEGORIES.CL.shortName,
  core_rotational: CATEGORIES.CR.shortName,
  core_stability: CATEGORIES.CS.shortName,
  cardio: "Cardio",
  lower: "Lower",
  upper_push: "Push",
  upper_pull: "Pull",
};

export const LAYOUT_GROUP_TO_CATEGORY: Record<LayoutGroup, ExerciseCategory> = {
  core_front: "CF",
  core_lower: "CL",
  core_rotational: "CR",
  core_stability: "CS",
  cardio: "PC",
  lower: "LB",
  upper_push: "UP",
  upper_pull: "UPL",
};

const CATEGORY_TO_LAYOUT_GROUP: Partial<Record<ExerciseCategory, LayoutGroup>> =
  {
    CF: "core_front",
    CL: "core_lower",
    CR: "core_rotational",
    CS: "core_stability",
    PC: "cardio",
    LB: "lower",
    UP: "upper_push",
    UPL: "upper_pull",
  };

const CORE_LAYOUT_GROUPS: LayoutGroup[] = [
  "core_front",
  "core_lower",
  "core_rotational",
  "core_stability",
];

const LEGACY_EMPHASIS_GROUPS = new Set([
  "core",
  "cardio",
  "lower",
  "upper_push",
  "upper_pull",
]);

/** Sun (0) … Sat (6) → enabled layout groups that day. */
export type WeeklyCategoryLayout = Record<number, LayoutGroup[]>;

export type ProgramMode = "preset" | "custom";

/** @deprecated Use {@link ProgramMode} `"preset"`. */
export type LegacyProgramModePriorities = "priorities";

/** @deprecated Migrated to {@link ProgramMode} `"custom"` + guided blueprint. */
export type LegacyProgramModeLayout = "layout";

export const PROGRAM_MODE_LABELS: Record<
  ProgramMode,
  { label: string; description: string }
> = {
  preset: {
    label: "PPL",
    description:
      "Push, pull, and legs on a fixed weekly calendar. Rounds 1–3 repeat the same exercises; cardio uses the endurance block. Customize rest days below for a lighter week.",
  },
  custom: {
    label: "Custom",
    description:
      "Guided: describe your week and we generate exercises. Manual: you pick every movement yourself.",
  },
};

/** Canonical mode id; accepts legacy DB values until all rows are migrated. */
export function sanitizeProgramMode(raw: unknown): ProgramMode {
  if (raw === "priorities" || raw === "preset") return "preset";
  if (raw === "layout" || raw === "custom") return "custom";
  return "preset";
}

export function isLegacyLayoutProgramMode(raw: unknown): boolean {
  return raw === "layout";
}

export function layoutGroupForCategory(
  category: ExerciseCategory,
): LayoutGroup | null {
  return CATEGORY_TO_LAYOUT_GROUP[category] ?? null;
}

/** Groups implied by catalog `strengthFocus` / `coreGroups` / jog. */
export function groupsForCatalogDay(plan: DayPlan): LayoutGroup[] {
  const found = new Set<LayoutGroup>();
  for (const cat of [...plan.strengthFocus, ...plan.coreGroups]) {
    const group = layoutGroupForCategory(cat);
    if (group) found.add(group);
  }
  const hasPc =
    planHasJog(plan) ||
    (plan.cardioActivities?.length ?? 0) > 0 ||
    plan.strengthFocus.includes("PC") ||
    plan.coreGroups.includes("PC");
  if (hasPc) found.add("cardio");
  return LAYOUT_GROUP_ORDER.filter((g) => found.has(g));
}

export function suggestLayoutFromCatalog(): WeeklyCategoryLayout {
  const out: WeeklyCategoryLayout = {};
  for (const plan of TRAINING_WEEK_CATALOG) {
    out[plan.dayOfWeek] = groupsForCatalogDay(plan);
  }
  return out;
}

function coreLayoutGroupsForCatalogDay(dayOfWeek: number): LayoutGroup[] {
  const plan = TRAINING_WEEK_CATALOG.find((d) => d.dayOfWeek === dayOfWeek);
  if (!plan) return [...CORE_LAYOUT_GROUPS];
  return groupsForCatalogDay(plan).filter((g) =>
    CORE_LAYOUT_GROUPS.includes(g),
  );
}

function normalizeLayoutGroupToken(
  item: string,
  dayOfWeek: number,
): LayoutGroup[] {
  if ((LAYOUT_GROUP_ORDER as string[]).includes(item)) {
    return [item as LayoutGroup];
  }
  if (item === "core") {
    const fromCatalog = coreLayoutGroupsForCatalogDay(dayOfWeek);
    return fromCatalog.length > 0 ? fromCatalog : [...CORE_LAYOUT_GROUPS];
  }
  if (LEGACY_EMPHASIS_GROUPS.has(item) && item !== "core") {
    return [item as LayoutGroup];
  }
  return [];
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
    const groups: LayoutGroup[] = [];
    for (const item of dayRaw) {
      if (typeof item !== "string") continue;
      for (const g of normalizeLayoutGroupToken(item, dow)) {
        if (!groups.includes(g)) groups.push(g);
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
  if (
    settings.weeklyCategoryLayoutCustomized &&
    settings.weeklyCategoryLayout
  ) {
    return sanitizeWeeklyCategoryLayout(settings.weeklyCategoryLayout);
  }
  return suggestLayoutFromCatalog();
}

/** Map enabled layout groups for a day to exercise categories (respects jog only when cardio on). */
export function categoriesForDayLayout(
  plan: DayPlan,
  groups: LayoutGroup[],
): ExerciseCategory[] {
  if (groups.length === 0) return [];
  const out: ExerciseCategory[] = [];
  for (const group of groups) {
    const cat = LAYOUT_GROUP_TO_CATEGORY[group];
    if (cat === "PC" && !planHasJog(plan) && group === "cardio") continue;
    if (!out.includes(cat)) out.push(cat);
  }
  return out;
}

/** Layout groups enabled for a day (for equal-weight round fill). */
export function layoutGroupsForDay(
  plan: DayPlan,
  groups: LayoutGroup[],
): LayoutGroup[] {
  if (groups.length === 0) return [];
  return groups.filter((group) => {
    if (group === "cardio" && !planHasJog(plan)) return false;
    return true;
  });
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

export function describeDayLayout(groups: LayoutGroup[]): string {
  if (groups.length === 0) return "Rest — no generated exercises";
  return groups.map((g) => LAYOUT_GROUP_LABELS[g]).join(" · ");
}
