"use client";

import { useMemo, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import { formatLaterRoundWarning, pickRandomSwap } from "@/lib/exerciseSwap";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { formatPlanTargetPrescription } from "@/utils/effectiveExerciseSettings";
import type { Exercise } from "@/types";

interface SwapExerciseModalProps {
  open: boolean;
  plannedName: string;
  candidates: Exercise[];
  hasSwap: boolean;
  /** Add vs replace an existing slot (affects title and confirm copy). */
  mode?: "swap" | "add";
  /** Exercise id → round numbers after the current round where it already appears. */
  laterRoundByExerciseId?: ReadonlyMap<string, readonly number[]>;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
  onClearSwap: () => void;
  /** Shown when the candidate list is empty (before search). */
  emptyPoolMessage?: string;
}

export default function SwapExerciseModal({
  open,
  plannedName,
  candidates,
  hasSwap,
  mode = "swap",
  laterRoundByExerciseId,
  onClose,
  onPick,
  onClearSwap,
  emptyPoolMessage = "No other exercises in this category for this round.",
}: SwapExerciseModalProps) {
  const [query, setQuery] = useState("");
  const byExerciseId = useExerciseSettingsStore((s) => s.byExerciseId);
  const expertiseByGroup = useSettingsStore((s) => s.expertiseByGroup);
  const [pendingLaterRound, setPendingLaterRound] = useState<{
    exerciseId: string;
    name: string;
    roundNumbers: readonly number[];
  } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => c.name.toLowerCase().includes(q));
  }, [candidates, query]);

  const targetByExerciseId = useMemo(() => {
    const map = new Map<string, string>();
    for (const ex of candidates) {
      map.set(
        ex.id,
        formatPlanTargetPrescription(ex, byExerciseId[ex.id], {
          expertiseByGroup,
        }),
      );
    }
    return map;
  }, [candidates, byExerciseId, expertiseByGroup]);

  function resetPending() {
    setPendingLaterRound(null);
  }

  function handleClose() {
    resetPending();
    onClose();
  }

  function commitPick(exerciseId: string) {
    onPick(exerciseId);
    resetPending();
    onClose();
  }

  function requestPick(exercise: Exercise) {
    const laterRounds = laterRoundByExerciseId?.get(exercise.id);
    if (laterRounds && laterRounds.length > 0) {
      setPendingLaterRound({
        exerciseId: exercise.id,
        name: exercise.name,
        roundNumbers: laterRounds,
      });
      return;
    }
    commitPick(exercise.id);
  }

  function handleRandom() {
    const pick = pickRandomSwap(
      filtered.length > 0 ? filtered : candidates,
    );
    if (!pick) return;
    requestPick(pick);
  }

  const confirmHint = pendingLaterRound
    ? formatLaterRoundWarning(pendingLaterRound.roundNumbers)
    : "";

  const title = mode === "add" ? "Add exercise" : "Swap exercise";
  const hint =
    mode === "add"
      ? "Search the catalog or pick from the list."
      : `Same category as prescribed · planned: ${plannedName}`;
  const confirmVerb = mode === "add" ? "add" : "swap to";

  return (
    <BottomSheetModal
      open={open}
      onClose={handleClose}
      title={title}
      hint={hint}
      ariaLabel={title}
      headerExtra={
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={handleRandom}
            disabled={candidates.length === 0 || !!pendingLaterRound}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-40"
          >
            Random pick
          </button>
          {hasSwap && (
            <button
              type="button"
              onClick={() => {
                onClearSwap();
                handleClose();
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
      {pendingLaterRound ? (
        <div className="space-y-4 px-4 py-4">
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 space-y-2">
            <p className="text-sm font-medium text-amber-200">
              Already in a later round
            </p>
            <p className="text-sm text-foreground leading-snug">
              <span className="font-semibold">{pendingLaterRound.name}</span>{" "}
              {confirmHint}. You can still {confirmVerb} it, but you&apos;ll repeat that
              movement later unless you change those slots too.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => commitPick(pendingLaterRound.exerciseId)}
              className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
            >
              {mode === "add" ? "Add anyway" : "Swap anyway"}
            </button>
            <button
              type="button"
              onClick={resetPending}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              Choose another
            </button>
          </div>
        </div>
      ) : (
        <>
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
                  ? emptyPoolMessage
                  : "No matches."}
              </li>
            ) : (
              filtered.map((ex) => {
                const laterRounds = laterRoundByExerciseId?.get(ex.id);
                const laterHint =
                  laterRounds && laterRounds.length > 0
                    ? formatLaterRoundWarning(laterRounds)
                    : null;
                return (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => requestPick(ex)}
                      className="flex w-full flex-col items-stretch gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover"
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex-1 font-medium text-foreground">
                          {ex.name}
                        </span>
                        <span className="text-caption tabular-nums text-muted shrink-0">
                          {targetByExerciseId.get(ex.id) ?? ex.defaultReps}
                        </span>
                      </span>
                      {laterHint ? (
                        <span className="text-sm font-medium text-amber-400/90">
                          {laterHint}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </>
      )}
    </BottomSheetModal>
  );
}
