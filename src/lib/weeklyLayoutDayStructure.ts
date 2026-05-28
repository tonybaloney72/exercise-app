import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import {
  LAYOUT_GROUP_LABELS,
  LAYOUT_GROUP_ORDER,
  type LayoutGroup,
  type WeeklyCategoryLayout,
} from "@/lib/weeklyCategoryLayout";

/** How weekly layout allocates groups across rounds. */
export type LayoutDayStructureMode = "mixed" | "blocks" | "repeat";

export type LayoutDayStructure = {
  mode: LayoutDayStructureMode;
  /** Round count per enabled group (0 = off). */
  groupRounds: Partial<Record<LayoutGroup, number>>;
  /** Total rounds when {@link mode} is `mixed` (1–6). */
  mixedRoundCount?: number;
  /** Repeat the same exercises in every round for each non-cardio group. */
  repeatStrength: boolean;
};

/** Sun (0) … Sat (6) → day structure. */
export type WeeklyLayoutDayStructure = Record<number, LayoutDayStructure>;

export const LAYOUT_DAY_STRUCTURE_MODE_LABELS: Record<
  LayoutDayStructureMode,
  { label: string; hint: string }
> = {
  mixed: {
    label: "Mixed",
    hint: "Blend groups in each round; set total rounds below.",
  },
  blocks: {
    label: "Blocks",
    hint: "Separate rounds per group — e.g. 3× Pull then 1× Cardio.",
  },
  repeat: {
    label: "Repeat",
    hint: "Same exercises every round per group, then move on.",
  },
};

const STRENGTH_LAYOUT_GROUPS = new Set<LayoutGroup>([
  "core_front",
  "core_lower",
  "core_rotational",
  "core_stability",
  "lower",
  "upper_push",
  "upper_pull",
]);

export function isStrengthLayoutGroup(group: LayoutGroup): boolean {
  return STRENGTH_LAYOUT_GROUPS.has(group);
}

export function defaultGroupRounds(
  enabled: LayoutGroup[],
  catalogRoundCount = 3,
): Partial<Record<LayoutGroup, number>> {
  const out: Partial<Record<LayoutGroup, number>> = {};
  const hasCardio = enabled.includes("cardio");
  const nonCardio = enabled.filter((g) => g !== "cardio");

  if (nonCardio.length === 0) {
    if (hasCardio) out.cardio = catalogRoundCount;
    return out;
  }

  if (nonCardio.length === 1) {
    out[nonCardio[0]!] = catalogRoundCount;
    if (hasCardio) out.cardio = 1;
    return out;
  }

  const base = Math.max(1, Math.floor(catalogRoundCount / nonCardio.length));
  for (const g of nonCardio) out[g] = base;
  if (hasCardio) out.cardio = 1;
  return out;
}

export function defaultLayoutDayStructure(
  enabled: LayoutGroup[],
  catalogRoundCount = 3,
): LayoutDayStructure {
  if (enabled.length === 0) {
    return {
      mode: "mixed",
      groupRounds: {},
      repeatStrength: false,
    };
  }

  if (enabled.length === 1) {
    const g = enabled[0]!;
    return {
      mode: "blocks",
      groupRounds: { [g]: catalogRoundCount },
      repeatStrength: false,
    };
  }

  return {
    mode: "blocks",
    groupRounds: defaultGroupRounds(enabled, catalogRoundCount),
    repeatStrength: false,
  };
}

function sanitizeGroupRounds(
  raw: unknown,
  enabled: LayoutGroup[],
  fallback: Partial<Record<LayoutGroup, number>>,
): Partial<Record<LayoutGroup, number>> {
  const out: Partial<Record<LayoutGroup, number>> = {};
  const source =
    raw && typeof raw === "object"
      ? (raw as Partial<Record<LayoutGroup, number>>)
      : {};
  for (const g of enabled) {
    const n = source[g];
    if (typeof n === "number" && Number.isFinite(n)) {
      out[g] = Math.max(0, Math.min(6, Math.round(n)));
    } else {
      out[g] = fallback[g] ?? 0;
    }
  }
  return out;
}

function sanitizeMixedRoundCount(
  raw: unknown,
  catalogRoundCount: number,
): number {
  const fallback = Math.max(1, Math.min(6, catalogRoundCount));
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.min(6, Math.round(raw)));
  }
  return fallback;
}

/** Effective round count for mixed mode (catalog default when unset). */
export function resolveMixedRoundCount(
  structure: LayoutDayStructure,
  catalogRoundCount: number,
): number {
  return sanitizeMixedRoundCount(
    structure.mixedRoundCount,
    catalogRoundCount,
  );
}

export function sanitizeLayoutDayStructure(
  raw: unknown,
  enabled: LayoutGroup[],
  catalogRoundCount = 3,
): LayoutDayStructure {
  const defaults = defaultLayoutDayStructure(enabled, catalogRoundCount);
  if (!raw || typeof raw !== "object") return defaults;

  const o = raw as Record<string, unknown>;
  const mode =
    o.mode === "mixed" || o.mode === "blocks" || o.mode === "repeat"
      ? o.mode
      : defaults.mode;

  const groupRounds = sanitizeGroupRounds(
    o.groupRounds,
    enabled,
    defaults.groupRounds,
  );

  const resolvedMode =
    enabled.length <= 1 && mode === "mixed" ? "blocks" : mode;

  return {
    mode: resolvedMode,
    groupRounds,
    mixedRoundCount: sanitizeMixedRoundCount(
      o.mixedRoundCount,
      catalogRoundCount,
    ),
    repeatStrength:
      typeof o.repeatStrength === "boolean"
        ? o.repeatStrength
        : mode === "repeat"
          ? true
          : defaults.repeatStrength,
  };
}

export function sanitizeWeeklyLayoutDayStructure(
  raw: unknown,
  layout: WeeklyCategoryLayout,
): WeeklyLayoutDayStructure {
  const out: WeeklyLayoutDayStructure = {};
  for (let dow = 0; dow < 7; dow++) {
    const enabled = layout[dow] ?? [];
    const catalog = getCatalogPlanForDay(dow);
    const catalogRounds = catalog.rounds.length || 3;
    const dayRaw =
      raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)[String(dow)]
        : undefined;
    out[dow] = sanitizeLayoutDayStructure(dayRaw, enabled, catalogRounds);
  }
  return out;
}

export function layoutDayStructureEqual(
  a: LayoutDayStructure,
  b: LayoutDayStructure,
): boolean {
  return (
    a.mode === b.mode &&
    a.repeatStrength === b.repeatStrength &&
    (a.mixedRoundCount ?? 0) === (b.mixedRoundCount ?? 0) &&
    LAYOUT_GROUP_ORDER.map((g) => a.groupRounds[g] ?? 0).join() ===
      LAYOUT_GROUP_ORDER.map((g) => b.groupRounds[g] ?? 0).join()
  );
}

export function weeklyLayoutDayStructureEqual(
  a: WeeklyLayoutDayStructure,
  b: WeeklyLayoutDayStructure,
): boolean {
  for (let dow = 0; dow < 7; dow++) {
    if (!layoutDayStructureEqual(a[dow] ?? defaultForDow(dow, []), b[dow] ?? defaultForDow(dow, []))) {
      return false;
    }
  }
  return true;
}

function defaultForDow(dow: number, enabled: LayoutGroup[]): LayoutDayStructure {
  const catalog = getCatalogPlanForDay(dow);
  return defaultLayoutDayStructure(enabled, catalog.rounds.length || 3);
}

export function resolveLayoutDayStructure(
  dow: number,
  enabled: LayoutGroup[],
  weekly?: WeeklyLayoutDayStructure,
): LayoutDayStructure {
  const catalog = getCatalogPlanForDay(dow);
  const stored = weekly?.[dow];
  return sanitizeLayoutDayStructure(
    stored,
    enabled,
    catalog.rounds.length || 3,
  );
}

export type LayoutRoundSpec = {
  roundNumber: number;
  group: LayoutGroup | "mixed";
};

/** Ordered rounds for blocks/repeat; mixed uses catalog round count. */
export function buildLayoutRoundSpecs(
  enabled: LayoutGroup[],
  structure: LayoutDayStructure,
  catalogRoundCount: number,
): LayoutRoundSpec[] {
  if (enabled.length === 0) return [];

  if (structure.mode === "mixed") {
    const count = resolveMixedRoundCount(structure, catalogRoundCount);
    return Array.from({ length: count }, (_, i) => ({
      roundNumber: i + 1,
      group: "mixed" as const,
    }));
  }

  const specs: LayoutRoundSpec[] = [];
  let roundNumber = 1;
  const blockOrder = [
    ...LAYOUT_GROUP_ORDER.filter((g) => g !== "cardio"),
    ...(enabled.includes("cardio") ? (["cardio"] as const) : []),
  ];
  for (const group of blockOrder) {
    if (!enabled.includes(group)) continue;
    const count = structure.groupRounds[group] ?? 0;
    for (let i = 0; i < count; i++) {
      specs.push({ roundNumber, group });
      roundNumber += 1;
    }
  }
  return specs;
}

export function totalLayoutRounds(specs: LayoutRoundSpec[]): number {
  return specs.length;
}

export function describeLayoutDayStructure(
  enabled: LayoutGroup[],
  structure: LayoutDayStructure,
): string {
  if (enabled.length === 0) return "Rest";

  if (structure.mode === "mixed") {
    const n = resolveMixedRoundCount(structure, 3);
    return `${n} mixed round${n === 1 ? "" : "s"}`;
  }

  const parts: string[] = [];
  for (const g of LAYOUT_GROUP_ORDER) {
    if (!enabled.includes(g)) continue;
    const n = structure.groupRounds[g] ?? 0;
    if (n <= 0) continue;
    parts.push(`${n}× ${LAYOUT_GROUP_LABELS[g]}`);
  }

  if (parts.length === 0) return "No rounds";
  const repeat =
    structure.mode === "repeat" || structure.repeatStrength
      ? " · same exercises each round"
      : " · varied exercises";
  return `${parts.join(" · ")}${repeat}`;
}

export function weeklyLayoutDayStructureFingerprint(
  structure: WeeklyLayoutDayStructure,
  layout: WeeklyCategoryLayout,
): string {
  const seg = [0, 1, 2, 3, 4, 5, 6]
    .map((dow) => {
      const enabled = layout[dow] ?? [];
      const s = resolveLayoutDayStructure(dow, enabled, structure);
      if (enabled.length === 0) return `${dow}:-`;
      const rounds = LAYOUT_GROUP_ORDER.map(
        (g) => `${g}:${s.groupRounds[g] ?? 0}`,
      ).join(",");
      const mixed = s.mode === "mixed" ? `|m${s.mixedRoundCount ?? 0}` : "";
      return `${dow}:${s.mode}|${rounds}|r${s.repeatStrength ? 1 : 0}${mixed}`;
    })
    .join(";");
  return `wlds:${seg}`;
}

export function suggestWeeklyLayoutDayStructure(
  layout: WeeklyCategoryLayout,
): WeeklyLayoutDayStructure {
  return sanitizeWeeklyLayoutDayStructure(undefined, layout);
}
