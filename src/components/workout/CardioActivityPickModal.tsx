"use client";

import BottomSheetModal from "@/components/common/BottomSheetModal";
import CardioActivityPickList from "@/components/workout/CardioActivityPickList";
import { CARDIO_ACTIVITY_ORDER } from "@/lib/cardioActivities";
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
      <CardioActivityPickList
        kinds={kinds ?? CARDIO_ACTIVITY_ORDER}
        onPick={onPick}
      />
    </BottomSheetModal>
  );
}
