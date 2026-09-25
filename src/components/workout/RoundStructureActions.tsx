"use client";

type Props = {
  roundIndex: number;
  isEmptyRound: boolean;
  disabled?: boolean;
  onAddExercise: () => void;
  onCopyRepeat?: () => void;
  onCopyStructure?: () => void;
  onCustomize?: () => void;
};

const btnOutline =
  "rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50";
const btnAccent =
  "rounded-lg border border-accent/40 bg-accent/10 px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/20 disabled:opacity-50";

const addRoundBelowButtonClassName =
  "w-full rounded-lg border border-dashed border-border px-2 py-1.5 text-xs font-medium text-muted hover:border-accent/40 hover:text-foreground disabled:opacity-50";

/** Dashed control placed below a round card (outside the card border). */
export function AddRoundBelowButton({
  disabled = false,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={addRoundBelowButtonClassName}
    >
      + Add Round
    </button>
  );
}

export default function RoundStructureActions({
  roundIndex,
  isEmptyRound,
  disabled = false,
  onAddExercise,
  onCopyRepeat,
  onCopyStructure,
  onCustomize,
}: Props) {
  const canCopyFromPrior = roundIndex > 0 && onCopyRepeat && onCopyStructure;
  const showEmptyChoices = isEmptyRound && onCustomize;

  return (
    <div className="flex flex-col gap-2">
      {showEmptyChoices ? (
        <div className="flex flex-col px-3 py-2.5 gap-2">
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
      <button
        type="button"
        disabled={disabled}
        onClick={onAddExercise}
        className={addRoundBelowButtonClassName}
      >
        + Add Exercise
      </button>
    </div>
  );
}
