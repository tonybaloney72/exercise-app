import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import { applyWeeklyCardioToDay } from "@/lib/cardioActivities";
import {
  buildLayoutRoundSpecs,
  resolveLayoutDayStructure,
  resolveMixedRoundCount,
  suggestWeeklyLayoutDayStructure,
  type WeeklyLayoutDayStructure,
} from "@/lib/weeklyLayoutDayStructure";
import { applyRestDayToPlan } from "@/lib/restDays";
import {
  groupsForCatalogDay,
  LAYOUT_GROUP_ORDER,
  layoutGroupsForDay,
  type LayoutGroup,
  type WeeklyCategoryLayout,
} from "@/lib/weeklyCategoryLayout";
import type {
  CardioActivityKind,
  DayPlan,
  ExerciseEquipment,
  RestDayMode,
  WeeklyCardioByDay,
} from "@/types";

/** How a custom week is built (preset mode ignores this). */
export type CustomBuildStyle = "guided" | "manual";

export type RoundCloneMode = "repeat" | "structure";

export type DayBlueprintKind =
  | "workout"
  | "active_recovery"
  | "stretches"
  | "full_rest";

export type RoundBlueprint = {
  groups: LayoutGroup[];
  /** Override exercises per round; otherwise uses round density. */
  exerciseCount?: number;
  /** 0-based index of source round in the same day. */
  cloneOfRoundIndex?: number;
  cloneMode?: RoundCloneMode;
};

export type DayBlueprint = {
  dayKind: DayBlueprintKind;
  rounds: RoundBlueprint[];
  cardio?: CardioActivityKind[];
};

/** Sun (0) … Sat (6) → guided week blueprint. */
export type WeekBlueprint = Record<number, DayBlueprint>;

export const CUSTOM_BUILD_STYLE_LABELS: Record<
  CustomBuildStyle,
  { label: string; description: string }
> = {
  guided: {
    label: "Guided week",
    description:
      "Describe each day and round — we generate exercises for you. Best while you are still exploring movements.",
  },
  manual: {
    label: "Manual week",
    description:
      "Pick every exercise yourself on Weekly or in the week builder. For experienced lifters.",
  },
};

const DAY_KINDS: DayBlueprintKind[] = [
  "workout",
  "active_recovery",
  "stretches",
  "full_rest",
];

const CLONE_MODES: RoundCloneMode[] = ["repeat", "structure"];

function sanitizeDayKind(raw: unknown): DayBlueprintKind {
  if (typeof raw === "string" && DAY_KINDS.includes(raw as DayBlueprintKind)) {
    return raw as DayBlueprintKind;
  }
  return "workout";
}

function sanitizeRoundBlueprint(
  raw: unknown,
  fallbackGroups: LayoutGroup[] = [],
): RoundBlueprint {
  if (!raw || typeof raw !== "object") {
    return { groups: [...fallbackGroups] };
  }
  const o = raw as Record<string, unknown>;
  const groupsRaw = o.groups;
  const allowed = new Set(LAYOUT_GROUP_ORDER);
  const groups: LayoutGroup[] = Array.isArray(groupsRaw)
    ? groupsRaw.filter(
        (g): g is LayoutGroup =>
          typeof g === "string" && allowed.has(g as LayoutGroup),
      )
    : [...fallbackGroups];

  const exerciseCount =
    typeof o.exerciseCount === "number" && Number.isFinite(o.exerciseCount)
      ? Math.max(1, Math.min(8, Math.round(o.exerciseCount)))
      : undefined;

  const cloneOfRoundIndex =
    typeof o.cloneOfRoundIndex === "number" &&
    Number.isFinite(o.cloneOfRoundIndex)
      ? Math.max(0, Math.min(5, Math.round(o.cloneOfRoundIndex)))
      : undefined;

  const cloneMode =
    typeof o.cloneMode === "string" && CLONE_MODES.includes(o.cloneMode as RoundCloneMode)
      ? (o.cloneMode as RoundCloneMode)
      : undefined;

  return {
    groups,
    exerciseCount,
    cloneOfRoundIndex,
    cloneMode:
      cloneOfRoundIndex != null && cloneMode ? cloneMode : undefined,
  };
}

export function roundBlueprintGroupsEqual(
  a: RoundBlueprint,
  b: RoundBlueprint,
): boolean {
  if (a.groups.length !== b.groups.length) return false;
  return a.groups.every((g, i) => g === b.groups[i]);
}

/** Drop repeat-clone specs when groups no longer match the source round. */
export function sanitizeRoundCloneMetadata(
  rounds: RoundBlueprint[],
): RoundBlueprint[] {
  return rounds.map((round, index) => {
    if (round.cloneOfRoundIndex == null || !round.cloneMode) return round;
    const sourceIndex = round.cloneOfRoundIndex;
    if (
      sourceIndex < 0 ||
      sourceIndex >= rounds.length ||
      sourceIndex >= index
    ) {
      return {
        ...round,
        cloneOfRoundIndex: undefined,
        cloneMode: undefined,
      };
    }
    const source = rounds[sourceIndex];
    if (!source || !roundBlueprintGroupsEqual(round, source)) {
      return {
        ...round,
        cloneOfRoundIndex: undefined,
        cloneMode: undefined,
      };
    }
    return round;
  });
}

function sanitizeDayBlueprint(
  raw: unknown,
  dow: number,
  fallback?: DayBlueprint,
): DayBlueprint {
  const catalog = getCatalogPlanForDay(dow);
  const defaultGroups = groupsForCatalogDay(catalog);
  const fb: DayBlueprint = fallback ?? {
    dayKind: "workout",
    rounds: defaultGroups.length
      ? [{ groups: [...defaultGroups] }]
      : [],
    cardio: [],
  };

  if (!raw || typeof raw !== "object") return fb;
  const o = raw as Record<string, unknown>;
  const dayKind = sanitizeDayKind(o.dayKind ?? fb.dayKind);

  const roundsRaw = o.rounds;
  const rounds: RoundBlueprint[] = Array.isArray(roundsRaw)
    ? roundsRaw.map((r) => sanitizeRoundBlueprint(r, defaultGroups))
    : fb.rounds;

  const cardioRaw = o.cardio;
  const cardio: CardioActivityKind[] = Array.isArray(cardioRaw)
    ? cardioRaw.filter(
        (c): c is CardioActivityKind =>
          typeof c === "string" &&
          ["jog", "walk", "cycle", "hike", "swim"].includes(c),
      )
    : (fb.cardio ?? []);

  if (dayKind === "full_rest" || dayKind === "stretches") {
    return { dayKind, rounds: [], cardio: [] };
  }

  return { dayKind, rounds: sanitizeRoundCloneMetadata(rounds), cardio };
}

export function sanitizeWeekBlueprint(
  raw: unknown,
  fallback: WeekBlueprint = suggestWeekBlueprintFromCatalog(),
): WeekBlueprint {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const out: WeekBlueprint = {};
  for (let dow = 0; dow < 7; dow++) {
    const dayRaw = (raw as Record<string, unknown>)[String(dow)];
    out[dow] = sanitizeDayBlueprint(dayRaw, dow, fallback[dow]);
  }
  return out;
}

export function sanitizeCustomBuildStyle(raw: unknown): CustomBuildStyle {
  if (raw === "guided" || raw === "manual") return raw;
  return "guided";
}

export function suggestWeekBlueprintFromCatalog(): WeekBlueprint {
  const layout = suggestLayoutFromCatalogRecord();
  const structure = suggestStructureFromLayout(layout);
  return migrateLayoutToBlueprint(layout, structure);
}

function suggestLayoutFromCatalogRecord(): WeeklyCategoryLayout {
  const out: WeeklyCategoryLayout = {};
  for (let dow = 0; dow < 7; dow++) {
    out[dow] = groupsForCatalogDay(getCatalogPlanForDay(dow));
  }
  return out;
}

function suggestStructureFromLayout(
  layout: WeeklyCategoryLayout,
): WeeklyLayoutDayStructure {
  return suggestWeeklyLayoutDayStructure(layout);
}

/** Best-effort conversion from legacy weekly layout settings. */
export function migrateLayoutToBlueprint(
  layout: WeeklyCategoryLayout,
  structure: WeeklyLayoutDayStructure,
  cardioByDay?: WeeklyCardioByDay,
): WeekBlueprint {
  const out: WeekBlueprint = {};
  for (let dow = 0; dow < 7; dow++) {
    const enabled = layout[dow] ?? [];
    const catalog = getCatalogPlanForDay(dow);
    const cardio = cardioByDay?.[dow] ?? [];

    if (enabled.length === 0) {
      out[dow] = { dayKind: "full_rest", rounds: [], cardio: [] };
      continue;
    }

    const resolved = resolveLayoutDayStructure(dow, enabled, structure);
    const catalogRoundCount = catalog.rounds.length || 3;
    const groups = layoutGroupsForDay(catalog, enabled);
    const rounds: RoundBlueprint[] = [];

    if (resolved.mode === "mixed") {
      const count = resolveMixedRoundCount(resolved, catalogRoundCount);
      for (let i = 0; i < count; i++) {
        rounds.push({ groups: [...groups] });
      }
    } else {
      const specs = buildLayoutRoundSpecs(
        enabled,
        resolved,
        catalogRoundCount,
      );
      for (const spec of specs) {
        if (spec.group !== "mixed") {
          rounds.push({ groups: [spec.group] });
        }
      }
    }

    out[dow] = {
      dayKind: "workout",
      rounds,
      cardio: [...cardio],
    };
  }
  return out;
}

export function resolveWeekBlueprint(settings: {
  weekBlueprint?: WeekBlueprint;
  weekBlueprintCustomized?: boolean;
}): WeekBlueprint {
  if (settings.weekBlueprintCustomized && settings.weekBlueprint) {
    return sanitizeWeekBlueprint(settings.weekBlueprint);
  }
  return suggestWeekBlueprintFromCatalog();
}

export function resolveDayBlueprintForSettings(
  settings: {
    weekBlueprint?: WeekBlueprint;
    weekBlueprintCustomized?: boolean;
  },
  dayOfWeek: number,
): DayBlueprint {
  return (
    resolveWeekBlueprint(settings)[dayOfWeek] ?? {
      dayKind: "full_rest",
      rounds: [],
      cardio: [],
    }
  );
}

export function weekBlueprintEqual(a: WeekBlueprint, b: WeekBlueprint): boolean {
  return weeklyBlueprintFingerprint(a) === weeklyBlueprintFingerprint(b);
}

export function weeklyBlueprintFingerprint(blueprint: WeekBlueprint): string {
  const seg = [0, 1, 2, 3, 4, 5, 6]
    .map((dow) => {
      const day = blueprint[dow] ?? {
        dayKind: "full_rest" as const,
        rounds: [],
      };
      const roundSeg = day.rounds
        .map((r, i) => {
          const g = r.groups.join("+") || "-";
          const c =
            r.cloneOfRoundIndex != null && r.cloneMode
              ? `~${r.cloneOfRoundIndex}:${r.cloneMode}`
              : "";
          const n = r.exerciseCount != null ? `@${r.exerciseCount}` : "";
          return `${i}:${g}${n}${c}`;
        })
        .join(";");
      const cardio = (day.cardio ?? []).join("+") || "-";
      return `${dow}:${day.dayKind}|${roundSeg}|c:${cardio}`;
    })
    .join(";");
  return `wbp:${seg}`;
}

export function dayBlueprintKindToRestMode(kind: DayBlueprintKind): RestDayMode {
  switch (kind) {
    case "active_recovery":
      return "active_recovery";
    case "stretches":
      return "stretches";
    case "full_rest":
      return "full_rest";
    default:
      return "workout";
  }
}

/** Apply blueprint cardio + rest metadata to a catalog shell (guided custom). */
export function applyDayBlueprintMetadata(
  plan: DayPlan,
  day: DayBlueprint,
  availableEquipment: ExerciseEquipment[],
): DayPlan {
  let next = { ...plan };
  if (day.dayKind === "workout" || day.dayKind === "active_recovery") {
    next = applyWeeklyCardioToDay(
      next,
      day.cardio ?? [],
      availableEquipment,
    );
  }
  next = applyRestDayToPlan(next, dayBlueprintKindToRestMode(day.dayKind));
  return next;
}
