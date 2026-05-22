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
  /** Subset to show; defaults to all activities in catalog order. */
  kinds?: readonly CardioActivityKind[];
  title?: string;
  hint?: string;
  placement?: "sheet" | "center";
}

export default function CardioActivityPickModal({
  open,
  onClose,
  onPick,
  kinds,
  title = "Add cardio activity",
  hint = "Choose an activity to log distance and time.",
  placement = "sheet",
}: CardioActivityPickModalProps) {
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const list = kinds ?? CARDIO_ACTIVITY_ORDER;

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title={title}
      hint={hint}
      ariaLabel={title}
      placement={placement}
      bodyClassName="overflow-y-auto px-2 py-3 max-h-[min(60vh,420px)]"
    >
      {list.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted text-center">
          No other activities available.
        </p>
      ) : (
        <ul>
          {list.map((kind) => {
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
      )}
    </BottomSheetModal>
  );
}
