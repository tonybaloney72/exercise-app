import type {
  ExerciseEquipment,
  WeightInventory,
  WeightInventoryEntry,
  WeightInventoryKind,
} from "@/types";

const WEIGHT_INVENTORY_KINDS: WeightInventoryKind[] = [
  "dumbbell",
  "kettlebell",
  "barbell",
  "medicine_ball",
];

export const WEIGHT_INVENTORY_KIND_LABELS: Record<WeightInventoryKind, string> =
  {
    dumbbell: "Dumbbells",
    kettlebell: "Kettlebells",
    barbell: "Barbell plates",
    medicine_ball: "Medicine balls",
  };

/** Short hint under each inventory section. */
export const WEIGHT_INVENTORY_KIND_HINTS: Record<WeightInventoryKind, string> = {
  dumbbell: "Sizes you own (pairs counted as one size).",
  kettlebell: "Bell sizes you own.",
  barbell: "Plate denominations for your bar (not the bar weight).",
  medicine_ball: "Ball weights you own.",
};

/** Common quick-add chips (lb). */
export const WEIGHT_INVENTORY_PRESETS: Record<WeightInventoryKind, number[]> = {
  dumbbell: [5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50],
  kettlebell: [10, 15, 20, 25, 35, 40, 45, 50, 53, 70],
  barbell: [2.5, 5, 10, 25, 35, 45],
  medicine_ball: [6, 8, 10, 12, 14, 16, 20, 25],
};

const KIND_SET = new Set<string>(WEIGHT_INVENTORY_KINDS);

const EMPTY_WEIGHT_INVENTORY: WeightInventory = {};

const MAX_WEIGHT_LB = 500;
const MAX_COUNT = 99;

function isWeightInventoryKind(
  value: unknown,
): value is WeightInventoryKind {
  return typeof value === "string" && KIND_SET.has(value);
}

/** Round to nearest 0.5 lb so 2.5 plates and 15 lb DBs stay exact. */
export function normalizeWeightLb(raw: number): number | null {
  if (!Number.isFinite(raw) || raw <= 0 || raw > MAX_WEIGHT_LB) return null;
  const rounded = Math.round(raw * 2) / 2;
  return rounded > 0 ? rounded : null;
}

function sanitizeEntry(raw: unknown): WeightInventoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const weightLb = normalizeWeightLb(Number(o.weightLb));
  if (weightLb == null) return null;

  let count: number | undefined;
  if (o.count != null) {
    const n = Math.round(Number(o.count));
    if (Number.isFinite(n) && n >= 1 && n <= MAX_COUNT) count = n;
  }

  return count != null ? { weightLb, count } : { weightLb };
}

function sortEntries(entries: WeightInventoryEntry[]): WeightInventoryEntry[] {
  return [...entries].sort((a, b) => a.weightLb - b.weightLb);
}

/**
 * Merge duplicate denominations (same weightLb) by summing counts when present.
 */
function dedupeEntries(
  entries: WeightInventoryEntry[],
): WeightInventoryEntry[] {
  const byWeight = new Map<number, WeightInventoryEntry>();
  for (const entry of entries) {
    const existing = byWeight.get(entry.weightLb);
    if (!existing) {
      byWeight.set(entry.weightLb, { ...entry });
      continue;
    }
    const a = existing.count;
    const b = entry.count;
    if (a != null || b != null) {
      existing.count = Math.min(MAX_COUNT, (a ?? 1) + (b ?? 1));
    }
  }
  return sortEntries([...byWeight.values()]);
}

export function sanitizeWeightInventory(raw: unknown): WeightInventory {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_WEIGHT_INVENTORY };
  }

  const out: WeightInventory = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isWeightInventoryKind(key)) continue;
    if (!Array.isArray(value)) continue;
    const entries = dedupeEntries(
      value
        .map(sanitizeEntry)
        .filter((e): e is WeightInventoryEntry => e != null),
    );
    if (entries.length > 0) out[key] = entries;
  }
  return out;
}

export function getInventoryEntries(
  inventory: WeightInventory,
  kind: WeightInventoryKind,
): WeightInventoryEntry[] {
  return inventory[kind] ?? [];
}

export function listInventoryWeightsLb(
  inventory: WeightInventory,
  kind: WeightInventoryKind,
): number[] {
  return getInventoryEntries(inventory, kind).map((e) => e.weightLb);
}

/** Next heavier owned weight, or null if none. */
export function nextHeavierInventoryWeight(
  inventory: WeightInventory,
  kind: WeightInventoryKind,
  currentLb: number,
): number | null {
  const weights = listInventoryWeightsLb(inventory, kind);
  return weights.find((w) => w > currentLb) ?? null;
}

export function addInventoryWeight(
  inventory: WeightInventory,
  kind: WeightInventoryKind,
  weightLb: number,
  count?: number,
): WeightInventory {
  const normalized = normalizeWeightLb(weightLb);
  if (normalized == null) return inventory;

  const entry: WeightInventoryEntry =
    count != null && count >= 1
      ? { weightLb: normalized, count: Math.min(MAX_COUNT, Math.round(count)) }
      : { weightLb: normalized };

  const next = dedupeEntries([
    ...getInventoryEntries(inventory, kind),
    entry,
  ]);
  return { ...inventory, [kind]: next };
}

export function removeInventoryWeight(
  inventory: WeightInventory,
  kind: WeightInventoryKind,
  weightLb: number,
): WeightInventory {
  const normalized = normalizeWeightLb(weightLb);
  if (normalized == null) return inventory;

  const next = getInventoryEntries(inventory, kind).filter(
    (e) => e.weightLb !== normalized,
  );
  const out: WeightInventory = { ...inventory };
  if (next.length === 0) {
    delete out[kind];
  } else {
    out[kind] = next;
  }
  return out;
}

/** Inventory sections to show given the user's equipment toggles. */
export function visibleWeightInventoryKinds(
  availableEquipment: ExerciseEquipment[],
): WeightInventoryKind[] {
  const set = new Set(availableEquipment);
  return WEIGHT_INVENTORY_KINDS.filter((kind) => set.has(kind));
}

export function formatInventoryWeightLb(weightLb: number): string {
  const rounded = Math.round(weightLb * 2) / 2;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
