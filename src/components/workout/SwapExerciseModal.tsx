"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Exercise } from "@/types";

interface SwapExerciseModalProps {
  open: boolean;
  plannedName: string;
  candidates: Exercise[];
  hasSwap: boolean;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
  onRandom: () => void;
  onClearSwap: () => void;
}

export default function SwapExerciseModal({
  open,
  plannedName,
  candidates,
  hasSwap,
  onClose,
  onPick,
  onRandom,
  onClearSwap,
}: SwapExerciseModalProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => c.name.toLowerCase().includes(q));
  }, [candidates, query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Swap exercise"
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
            <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Swap exercise
                </h2>
                <p className="text-[11px] text-muted mt-0.5">
                  Same category as prescribed · planned: {plannedName}
                </p>
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
            </div>

            <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-border">
              <button
                type="button"
                onClick={() => {
                  onRandom();
                  onClose();
                }}
                disabled={candidates.length === 0}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-40"
              >
                Random pick
              </button>
              {hasSwap && (
                <button
                  type="button"
                  onClick={() => {
                    onClearSwap();
                    onClose();
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover"
                >
                  Use prescribed
                </button>
              )}
            </div>

            <div className="px-4 py-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                autoComplete="off"
              />
            </div>

            <ul className="max-h-[min(50vh,360px)] overflow-y-auto px-2 pb-4">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted">
                  {candidates.length === 0
                    ? "No other exercises in this category for this round."
                    : "No matches."}
                </li>
              ) : (
                filtered.map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(ex.id);
                        onClose();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-surface-hover transition-colors"
                    >
                      <span className="flex-1 font-medium text-foreground">
                        {ex.name}
                      </span>
                      <span className="text-[10px] text-muted tabular-nums">
                        {ex.defaultReps}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
