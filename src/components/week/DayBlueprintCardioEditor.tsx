"use client";

import {
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  cardioKindAllowed,
} from "@/lib/cardioActivities";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { uiChoicePillSolidClass } from "@/lib/uiClasses";
import type { CardioActivityKind } from "@/types";

type Props = {
  value: CardioActivityKind[];
  onChange: (next: CardioActivityKind[]) => void;
};

export default function DayBlueprintCardioEditor({ value, onChange }: Props) {
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);

  function toggleKind(kind: CardioActivityKind) {
    const next = value.includes(kind)
      ? value.filter((k) => k !== kind)
      : [...value, kind];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted">Cardio & endurance (optional)</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Cardio activities">
        {CARDIO_ACTIVITY_ORDER.map((kind) => {
          const allowed = cardioKindAllowed(kind, availableEquipment);
          const on = value.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              disabled={!allowed}
              title={!allowed ? "Enable equipment in Settings" : undefined}
              onClick={() => toggleKind(kind)}
              className={`${uiChoicePillSolidClass(on)} disabled:opacity-40`}
            >
              {CARDIO_ACTIVITY_LABELS[kind]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
