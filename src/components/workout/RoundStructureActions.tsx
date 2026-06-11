"use client";

import { MAX_WORKOUT_ROUNDS } from "@/lib/workoutLogStructure";

type Props = {
  roundIndex: number;
  roundCount: number;
  isEmptyRound: boolean;
  disabled?: boolean;
  onAddRoundBelow: () => void;
  onCopyRepeat?: () => void;
  onCopyStructure?: () => void;
  onCustomize?: () => void;
};

const btnOutline =
  "rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50";
const btnAccent =
  "rounded-lg border border-accent/40 bg-accent/10 px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/20 disabled:opacity-50";
const btnDashed =
  "w-full rounded-lg border border-dashed border-border px-2 py-1.5 text-xs font-medium text-muted hover:border-accent/40 hover:text-foreground disabled:opacity-50";

export default function RoundStructureActions({
  roundIndex,
  roundCount,
  isEmptyRound,
  disabled = false,
  onAddRoundBelow,
  onCopyRepeat,
  onCopyStructure,
  onCustomize,
}: Props) {
  const canAdd = roundCount < MAX_WORKOUT_ROUNDS;
  const canCopyFromPrior = roundIndex > 0 && onCopyRepeat && onCopyStructure;
  const showEmptyChoices = isEmptyRound && onCustomize;

  if (!showEmptyChoices && !canAdd) return null;

  return (
    <div className="space-y-2">
      {showEmptyChoices ? (
        <div className="rounded-lg border border-border bg-surface-hover/30 px-3 py-2.5 space-y-2">
          <p className="text-xs text-muted">
            {canCopyFromPrior
              ? "Fill this round from the one above, or customize it yourself."
              : "Add exercises to build this round."}
          </p>
          <div className="flex flex-wrap gap-2">
            {canCopyFromPrior ? (
              <>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onCopyRepeat}
                  className={btnOutline}
                >
                  Copy
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onCopyStructure}
                  className={btnOutline}
                >
                  Copy but different exercises
                </button>
              </>
            ) : null}
            <button
              type="button"
              disabled={disabled}
              onClick={onCustomize}
              className={btnAccent}
            >
              Customize
            </button>
          </div>
        </div>
      ) : null}
      {canAdd ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onAddRoundBelow}
          className={btnDashed}
        >
          + Add round
        </button>
      ) : null}
    </div>
  );
}
