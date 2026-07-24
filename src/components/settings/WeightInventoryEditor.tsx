"use client";

import { useMemo, useState } from "react";
import {
  WEIGHT_INVENTORY_KIND_HINTS,
  WEIGHT_INVENTORY_KIND_LABELS,
  WEIGHT_INVENTORY_PRESETS,
  addInventoryWeight,
  formatInventoryWeightLb,
  getInventoryEntries,
  normalizeWeightLb,
  removeInventoryWeight,
  visibleWeightInventoryKinds,
} from "@/lib/weightInventory";
import type {
  ExerciseEquipment,
  WeightInventory,
  WeightInventoryKind,
} from "@/types";
import { uiChoicePillClass } from "@/lib/uiClasses";

const inputClassName =
  "min-w-0 flex-1 rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-accent";

type WeightInventoryEditorProps = {
  availableEquipment: ExerciseEquipment[];
  inventory: WeightInventory;
  onChange: (next: WeightInventory) => void;
};

function KindInventoryBlock({
  kind,
  inventory,
  onChange,
}: {
  kind: WeightInventoryKind;
  inventory: WeightInventory;
  onChange: (next: WeightInventory) => void;
}) {
  const entries = getInventoryEntries(inventory, kind);
  const owned = useMemo(
    () => new Set(entries.map((e) => e.weightLb)),
    [entries],
  );
  const [customInput, setCustomInput] = useState("");

  function addWeight(weightLb: number) {
    onChange(addInventoryWeight(inventory, kind, weightLb));
  }

  function removeWeight(weightLb: number) {
    onChange(removeInventoryWeight(inventory, kind, weightLb));
  }

  function submitCustom() {
    const parsed = normalizeWeightLb(Number.parseFloat(customInput.trim()));
    if (parsed == null) return;
    addWeight(parsed);
    setCustomInput("");
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-hover/40 p-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {WEIGHT_INVENTORY_KIND_LABELS[kind]}
        </h3>
        <p className="mt-0.5 text-xs text-muted">
          {WEIGHT_INVENTORY_KIND_HINTS[kind]}
        </p>
      </div>

      {entries.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {entries.map((entry) => (
            <li key={entry.weightLb}>
              <button
                type="button"
                onClick={() => removeWeight(entry.weightLb)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent"
                aria-label={`Remove ${formatInventoryWeightLb(entry.weightLb)} lb`}
                title="Tap to remove"
              >
                <span>
                  {formatInventoryWeightLb(entry.weightLb)} lb
                  {entry.count != null && entry.count > 1
                    ? ` ×${entry.count}`
                    : ""}
                </span>
                <span aria-hidden className="text-accent/60">
                  ✕
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">None added yet.</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {WEIGHT_INVENTORY_PRESETS[kind].map((preset) => {
          const active = owned.has(preset);
          return (
            <button
              key={preset}
              type="button"
              disabled={active}
              onClick={() => addWeight(preset)}
              className={uiChoicePillClass(active)}
            >
              {formatInventoryWeightLb(preset)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={0.5}
          max={500}
          step={0.5}
          placeholder="Custom lb"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitCustom();
            }
          }}
          className={inputClassName}
        />
        <button
          type="button"
          onClick={submitCustom}
          className="shrink-0 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:border-accent/40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function WeightInventoryEditor({
  availableEquipment,
  inventory,
  onChange,
}: WeightInventoryEditorProps) {
  const kinds = visibleWeightInventoryKinds(availableEquipment);

  if (kinds.length === 0) {
    return (
      <p className="text-xs text-muted leading-relaxed">
        Enable dumbbells, kettlebells, barbell, or medicine ball above to track
        the exact weights you own. That powers smarter load progression later.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Weights you own
        </h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          Add the sizes on your rack (pounds). Progression suggestions will use
          these when it&apos;s time to go heavier and drop reps.
        </p>
      </div>
      {kinds.map((kind) => (
        <KindInventoryBlock
          key={kind}
          kind={kind}
          inventory={inventory}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
