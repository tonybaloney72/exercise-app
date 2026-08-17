"use client";

import { useState } from "react";
import {
  BASIC_EXERCISE_EQUIPMENT,
  EQUIPMENT_LABELS,
  STRENGTH_MACHINE_EQUIPMENT,
  STRENGTH_MACHINE_GROUPS,
  allStrengthMachinesSelected,
  someStrengthMachineSelected,
  setTypicalGymMachines,
} from "@/data/equipment";
import type { ExerciseEquipment } from "@/types";

type EquipmentPickerProps = {
  selected: ExerciseEquipment[];
  onChange: (next: ExerciseEquipment[]) => void;
};

function EquipmentChip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
        on
          ? "border-accent bg-accent/15 text-accent"
          : "border-border bg-surface-hover text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export default function EquipmentPicker({
  selected,
  onChange,
}: EquipmentPickerProps) {
  const typicalGymOn = allStrengthMachinesSelected(selected);
  const someMachines = someStrengthMachineSelected(selected);
  const [advancedOpen, setAdvancedOpen] = useState(
    someMachines && !typicalGymOn,
  );
  const selectedCount = STRENGTH_MACHINE_EQUIPMENT.filter((eq) =>
    selected.includes(eq),
  ).length;

  const toggle = (eq: ExerciseEquipment) => {
    const on = selected.includes(eq);
    const next: ExerciseEquipment[] = on
      ? selected.filter((x) => x !== eq)
      : [...selected, eq];
    if (next.length === 0) return;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Available equipment"
      >
        {BASIC_EXERCISE_EQUIPMENT.map((eq) => (
          <EquipmentChip
            key={eq}
            label={EQUIPMENT_LABELS[eq]}
            on={selected.includes(eq)}
            onClick={() => toggle(eq)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">Strength machines</p>
        <p className="text-xs text-muted">
          Plans only use the specific machines you select. A lat pulldown does
          not unlock a leg press.
        </p>
        <div className="flex flex-wrap gap-2">
          <EquipmentChip
            label="Typical gym set"
            on={typicalGymOn}
            onClick={() =>
              onChange(setTypicalGymMachines(selected, !typicalGymOn))
            }
          />
        </div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="self-start text-xs font-medium text-accent"
        >
          {advancedOpen ? "Hide specific machines" : "Choose specific machines"}
          {selectedCount > 0 && !typicalGymOn
            ? ` (${selectedCount} selected)`
            : ""}
        </button>
        {advancedOpen ? (
          <div className="flex flex-col gap-3">
            {STRENGTH_MACHINE_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted">{group.title}</p>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label={group.title}
                >
                  {group.items.map((eq) => (
                    <EquipmentChip
                      key={eq}
                      label={EQUIPMENT_LABELS[eq]}
                      on={selected.includes(eq)}
                      onClick={() => toggle(eq)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
