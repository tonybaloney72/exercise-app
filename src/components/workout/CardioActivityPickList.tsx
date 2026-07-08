"use client";

import {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  cardioKindAllowed,
} from "@/lib/cardioActivities";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { CardioActivityKind } from "@/types";

type Props = {
  onPick: (kind: CardioActivityKind) => void;
  /** Subset to show; defaults to all activities in catalog order. */
  kinds?: readonly CardioActivityKind[];
};

export default function CardioActivityPickList({ onPick, kinds }: Props) {
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const list = kinds ?? CARDIO_ACTIVITY_ORDER;

  if (list.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-muted text-center">
        No other activities available.
      </p>
    );
  }

  return (
    <ul>
      {list.map((kind) => {
        const allowed = cardioKindAllowed(kind, availableEquipment);
        return (
          <li key={kind}>
            <button
              type="button"
              disabled={!allowed}
              onClick={() => onPick(kind)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface-hover disabled:opacity-40"
            >
              <span className="text-lg" aria-hidden>
                {CARDIO_ACTIVITY_EMOJI[kind]}
              </span>
              <span className="text-sm font-medium text-foreground">
                {CARDIO_ACTIVITY_LABELS[kind]}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
