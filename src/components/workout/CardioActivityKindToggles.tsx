"use client";

import {
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  cardioKindAllowed,
} from "@/lib/cardioActivities";
import { uiChoicePillSolidClass } from "@/lib/uiClasses";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { CardioActivityKind, ExerciseEquipment } from "@/types";

type Props = {
  value: readonly CardioActivityKind[];
  onToggle: (kind: CardioActivityKind) => void;
  /** Override equipment list (defaults to settings store). */
  availableEquipment?: readonly ExerciseEquipment[];
  "aria-label"?: string;
  disabledTitle?: string;
};

/** Multi-select cardio activity kind chips (equipment-gated). */
export default function CardioActivityKindToggles({
  value,
  onToggle,
  availableEquipment: equipmentOverride,
  "aria-label": ariaLabel = "Cardio activities",
  disabledTitle = "Enable equipment in Settings",
}: Props) {
  const storeEquipment = useSettingsStore((s) => s.availableEquipment);
  const availableEquipment = equipmentOverride ?? storeEquipment;

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={ariaLabel}>
      {CARDIO_ACTIVITY_ORDER.map((kind) => {
        const allowed = cardioKindAllowed(kind, [...availableEquipment]);
        const on = value.includes(kind);
        return (
          <button
            key={kind}
            type="button"
            disabled={!allowed}
            title={!allowed ? disabledTitle : undefined}
            onClick={() => onToggle(kind)}
            className={`${uiChoicePillSolidClass(on)} disabled:opacity-40`}
          >
            {CARDIO_ACTIVITY_LABELS[kind]}
          </button>
        );
      })}
    </div>
  );
}
