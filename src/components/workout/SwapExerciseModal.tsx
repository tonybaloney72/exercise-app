"use client";

import { useMemo, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
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
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title="Swap exercise"
      hint={`Same category as prescribed · planned: ${plannedName}`}
      ariaLabel="Swap exercise"
      headerExtra={
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2">
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
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground"
            >
              Use prescribed
            </button>
          )}
        </div>
      }
      bodyClassName="overflow-hidden"
    >
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover"
              >
                <span className="flex-1 font-medium text-foreground">{ex.name}</span>
                <span className="text-[10px] tabular-nums text-muted">{ex.defaultReps}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </BottomSheetModal>
  );
}
