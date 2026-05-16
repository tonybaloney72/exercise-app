"use client";

import {
  ALL_EXERCISE_EQUIPMENT,
  EQUIPMENT_LABELS,
} from "@/data/equipment";
import type { ExerciseEquipment } from "@/types";

type EquipmentPickerProps = {
  selected: ExerciseEquipment[];
  onChange: (next: ExerciseEquipment[]) => void;
};

export default function EquipmentPicker({
  selected,
  onChange,
}: EquipmentPickerProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Available equipment">
      {ALL_EXERCISE_EQUIPMENT.map((eq) => {
        const on = selected.includes(eq);
        return (
          <button
            key={eq}
            type="button"
            onClick={() => {
              const next: ExerciseEquipment[] = on
                ? selected.filter((x) => x !== eq)
                : [...selected, eq];
              if (next.length === 0) return;
              onChange(next);
            }}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              on
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-surface-hover text-muted hover:text-foreground"
            }`}
          >
            {EQUIPMENT_LABELS[eq]}
          </button>
        );
      })}
    </div>
  );
}
