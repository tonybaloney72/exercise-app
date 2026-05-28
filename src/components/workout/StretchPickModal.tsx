"use client";

import { useMemo, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import CategoryBadge from "@/components/common/CategoryBadge";
import { CATEGORIES } from "@/data/categories";
import { pickRandomSwap } from "@/lib/exerciseSwap";
import type { Exercise } from "@/types";

interface StretchPickModalProps {
  open: boolean;
  title: string;
  hint?: string;
  plannedName?: string;
  candidates: Exercise[];
  hasSwap?: boolean;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
  onClearSwap?: () => void;
}

export default function StretchPickModal({
  open,
  title,
  hint,
  plannedName,
  candidates,
  hasSwap = false,
  onClose,
  onPick,
  onClearSwap,
}: StretchPickModalProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.muscleGroups?.some((m) => m.toLowerCase().includes(q)) ?? false),
    );
  }, [candidates, query]);

  function handleClose() {
    setQuery("");
    onClose();
  }

  function commitPick(exerciseId: string) {
    onPick(exerciseId);
    setQuery("");
    onClose();
  }

  const modalHint =
    hint ??
    (plannedName
      ? `Replacing ${plannedName}. Search by name or muscle group.`
      : "Search by name or muscle group.");

  return (
    <BottomSheetModal
      open={open}
      onClose={handleClose}
      title={title}
      hint={modalHint}
      ariaLabel={title}
      headerExtra={
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={() => {
              const pick = pickRandomSwap(filtered.length > 0 ? filtered : candidates);
              if (pick) commitPick(pick.id);
            }}
            disabled={candidates.length === 0}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-40"
          >
            Random pick
          </button>
          {hasSwap && onClearSwap && (
            <button
              type="button"
              onClick={() => {
                onClearSwap();
                handleClose();
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground"
            >
              Keep current
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
          placeholder="Search stretches…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          autoComplete="off"
        />
      </div>
      <ul className="max-h-[min(50vh,360px)] overflow-y-auto px-2 pb-4">
        {filtered.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted">
            {candidates.length === 0
              ? "No stretches available with your equipment and preferences."
              : "No matches."}
          </li>
        ) : (
          filtered.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => commitPick(ex.id)}
                className="flex w-full flex-col items-stretch gap-1 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="flex items-center gap-2">
                  <span className="flex-1 text-sm font-medium text-foreground">
                    {ex.name}
                  </span>
                  <span className="text-caption tabular-nums text-muted shrink-0">
                    {ex.defaultReps}
                  </span>
                </span>
                {ex.secondaryCategory ? (
                  <span className="flex items-center gap-1.5">
                    <CategoryBadge category={ex.secondaryCategory} size="sm" />
                    <span className="text-sm text-muted">
                      {CATEGORIES[ex.secondaryCategory].name}
                    </span>
                  </span>
                ) : null}
              </button>
            </li>
          ))
        )}
      </ul>
    </BottomSheetModal>
  );
}
