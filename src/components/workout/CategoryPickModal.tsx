"use client";

import { motion, AnimatePresence } from "framer-motion";
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
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                {hint && (
                  <p className="text-[11px] text-muted mt-0.5">{hint}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-muted hover:bg-surface-hover hover:text-foreground"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>

            <ul className="max-h-[min(60vh,420px)] overflow-y-auto px-2 py-3">
              {categories.map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(cat);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-surface-hover transition-colors"
                  >
                    <CategoryBadge category={cat} size="sm" />
                    <span className="text-sm font-medium text-foreground">
                      {CATEGORIES[cat].name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
