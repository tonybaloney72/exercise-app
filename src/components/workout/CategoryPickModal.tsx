"use client";

import BottomSheetModal from "@/components/common/BottomSheetModal";
import CategoryBadge from "@/components/common/CategoryBadge";
import { CATEGORIES } from "@/data/categories";
import type { ExerciseCategory } from "@/types";

interface CategoryPickModalProps {
  open: boolean;
  title: string;
  hint?: string;
  categories: ExerciseCategory[];
  onClose: () => void;
  onPick: (category: ExerciseCategory) => void;
}

export default function CategoryPickModal({
  open,
  title,
  hint,
  categories,
  onClose,
  onPick,
}: CategoryPickModalProps) {
  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title={title}
      hint={hint}
      ariaLabel={title}
      bodyClassName="overflow-y-auto px-2 py-3 max-h-[min(60vh,420px)]"
    >
      <ul>
        {categories.map((cat) => (
          <li key={cat}>
            <button
              type="button"
              onClick={() => {
                onPick(cat);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface-hover"
            >
              <CategoryBadge category={cat} size="sm" />
              <span className="text-sm font-medium text-foreground">
                {CATEGORIES[cat].name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </BottomSheetModal>
  );
}
