"use client";

import { useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import { sanitizeWeightLb } from "@/lib/exerciseLoad";
import { formatInventoryWeightLb } from "@/lib/weightInventory";

type ExerciseWeightFieldVariant = "working" | "libraryDefault";

type ExerciseWeightFieldProps = {
  weightLb: number | undefined;
  /** Logged-set only: offer “Use default” when a Library default exists. */
  defaultWeightLb?: number | null;
  inventoryWeights: number[];
  onChange: (weightLb: number | undefined) => void;
  /**
   * `working` — this set (BW / inventory / custom).
   * `libraryDefault` — saved Library default (unset / inventory / custom).
   */
  variant?: ExerciseWeightFieldVariant;
};

export default function ExerciseWeightField({
  weightLb,
  defaultWeightLb,
  inventoryWeights,
  onChange,
  variant = "working",
}: ExerciseWeightFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState("");

  const isLibraryDefault = variant === "libraryDefault";

  const defaultHint =
    !isLibraryDefault &&
    defaultWeightLb != null &&
    defaultWeightLb > 0
      ? sanitizeWeightLb(defaultWeightLb)
      : null;

  const hasWeight = weightLb != null && weightLb > 0;
  const displayLabel = hasWeight
    ? formatInventoryWeightLb(weightLb)
    : isLibraryDefault
      ? "None"
      : "BW";

  function applyWeight(next: number | undefined) {
    onChange(next);
    setPickerOpen(false);
    setCustomOpen(false);
    setCustomDraft("");
  }

  function commitCustom() {
    const trimmed = customDraft.trim();
    if (trimmed === "" || trimmed === "0" || /^0\.0*$/.test(trimmed)) {
      applyWeight(undefined);
      return;
    }
    if (!/^\d*\.?\d*$/.test(trimmed)) return;
    const parsed = sanitizeWeightLb(Number(trimmed));
    if (parsed == null) return;
    applyWeight(parsed);
  }

  const sheetTitle = isLibraryDefault ? "Default weight" : "Working weight";
  const triggerAria = hasWeight
    ? `${isLibraryDefault ? "Default" : "Working"} weight ${displayLabel} pounds. Tap to change.`
    : isLibraryDefault
      ? "No default weight. Tap to choose."
      : "No working weight. Tap to choose.";

  const chipClass = (selected: boolean) =>
    `rounded-xl border px-3 py-2 text-sm tabular-nums transition-colors ${
      selected
        ? "border-accent bg-accent/15 text-foreground"
        : "border-border bg-surface text-foreground hover:bg-surface-hover"
    }`;

  const rowBtnClass = (selected: boolean) =>
    `w-full rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
      selected
        ? "border-accent bg-accent/15 text-foreground"
        : "border-border bg-surface text-foreground hover:bg-surface-hover"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={`inline-flex min-w-14 items-center justify-end gap-0.5 rounded-md border border-border bg-background px-2 py-0.5 text-right text-sm outline-none hover:bg-surface-hover focus-visible:border-accent ${
          hasWeight
            ? "font-medium text-foreground tabular-nums"
            : "text-muted"
        }`}
        aria-label={triggerAria}
      >
        <span>{displayLabel}</span>
        <span className="text-caption text-muted" aria-hidden>
          ▾
        </span>
      </button>
      <span className="text-xs text-muted">lb</span>

      <BottomSheetModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setCustomOpen(false);
          setCustomDraft("");
        }}
        title={sheetTitle}
        hint={isLibraryDefault ? undefined : "BW means no load on this set."}
        ariaLabel={
          isLibraryDefault ? "Choose default weight" : "Choose working weight"
        }
      >
        <div className="flex flex-col gap-4 px-4 pb-4 pt-3">
          {!isLibraryDefault ? (
            <button
              type="button"
              onClick={() => applyWeight(undefined)}
              className={rowBtnClass(!hasWeight)}
            >
              No weight (BW)
            </button>
          ) : null}

          {defaultHint != null ? (
            <button
              type="button"
              onClick={() => applyWeight(defaultHint)}
              className={rowBtnClass(weightLb === defaultHint)}
            >
              Use default ({formatInventoryWeightLb(defaultHint)} lb)
            </button>
          ) : null}

          {inventoryWeights.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted">From inventory</p>
              <div className="flex flex-wrap gap-2">
                {inventoryWeights.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => applyWeight(w)}
                    className={chipClass(weightLb === w)}
                  >
                    {formatInventoryWeightLb(w)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted">Custom</p>
            {customOpen ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={customDraft}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "" && !/^\d*\.?\d*$/.test(val)) return;
                    setCustomDraft(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitCustom();
                  }}
                  placeholder="lb"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                  aria-label="Custom weight in pounds"
                />
                <button
                  type="button"
                  onClick={commitCustom}
                  className="shrink-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
                >
                  Set
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomOpen(true);
                  setCustomDraft(
                    hasWeight ? formatInventoryWeightLb(weightLb) : "",
                  );
                }}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm font-medium text-muted hover:bg-surface-hover hover:text-foreground"
              >
                Enter a weight…
              </button>
            )}
          </div>
        </div>
      </BottomSheetModal>
    </>
  );
}
