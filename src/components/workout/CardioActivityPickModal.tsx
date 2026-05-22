"use client";

import BottomSheetModal from "@/components/common/BottomSheetModal";
import {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  cardioKindAllowed,
} from "@/lib/cardioActivities";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { CardioActivityKind } from "@/types";

interface CardioActivityPickModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (kind: CardioActivityKind) => void;
}

export default function CardioActivityPickModal({
  open,
  onClose,
  onPick,
}: CardioActivityPickModalProps) {
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title="Add cardio activity"
      hint="Choose an activity to log distance and time."
      ariaLabel="Add cardio activity"
      bodyClassName="overflow-y-auto px-2 py-3 max-h-[min(60vh,420px)]"
    >
      <ul>
          {CARDIO_ACTIVITY_ORDER.map((kind) => {
            const allowed = cardioKindAllowed(kind, availableEquipment);
            return (
              <li key={kind}>
                <button
                  type="button"
                  disabled={!allowed}
                  onClick={() => {
                    onPick(kind);
                    onClose();
                  }}
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
    </BottomSheetModal>
  );
}
