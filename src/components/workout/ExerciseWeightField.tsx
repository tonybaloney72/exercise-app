"use client";

import { useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import { sanitizeWeightLb } from "@/lib/exerciseLoad";
import { formatInventoryWeightLb } from "@/lib/weightInventory";

type ExerciseWeightFieldProps = {
  weightLb: number | undefined;
  defaultWeightLb?: number | null;
  inventoryWeights: number[];
  onChange: (weightLb: number | undefined) => void;
};

export default function ExerciseWeightField({
  weightLb,
  defaultWeightLb,
  inventoryWeights,
  onChange,
}: ExerciseWeightFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState("");

  const defaultHint =
    defaultWeightLb != null && defaultWeightLb > 0
      ? sanitizeWeightLb(defaultWeightLb)
      : null;

  const hasWeight = weightLb != null && weightLb > 0;
  const displayLabel = hasWeight
    ? formatInventoryWeightLb(weightLb)
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
        aria-label={
          hasWeight
            ? `Working weight ${displayLabel} pounds. Tap to change.`
            : "No working weight. Tap to choose."
        }
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
        title="Working weight"
        hint="All sizes from your inventory. BW means no load."
        ariaLabel="Choose working weight"
      >
        <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
          <button
            type="button"
            onClick={() => applyWeight(undefined)}
            className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              !hasWeight
                ? "border-accent bg-accent/15 text-foreground"
                : "border-border bg-surface text-foreground hover:bg-surface-hover"
            }`}
          >
            No weight (BW)
          </button>

          {defaultHint != null ? (
            <button
              type="button"
              onClick={() => applyWeight(defaultHint)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                weightLb === defaultHint
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border bg-surface text-foreground hover:bg-surface-hover"
              }`}
            >
              Use default ({formatInventoryWeightLb(defaultHint)} lb)
            </button>
          ) : null}

          {inventoryWeights.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted">
                From inventory
              </p>
              <div className="flex flex-wrap gap-2">
                {inventoryWeights.map((w) => {
                  const selected = weightLb === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => applyWeight(w)}
                      className={`rounded-lg border px-3 py-1.5 text-sm tabular-nums transition-colors ${
                        selected
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border bg-background text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      {formatInventoryWeightLb(w)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="border-t border-border pt-3">
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
                  placeholder="Custom lb"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
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
                  setCustomDraft(hasWeight ? formatInventoryWeightLb(weightLb) : "");
                }}
                className="w-full rounded-xl border border-dashed border-border bg-transparent px-3 py-2.5 text-left text-sm font-medium text-muted hover:border-accent/40 hover:text-foreground"
              >
                Custom…
              </button>
            )}
          </div>
        </div>
      </BottomSheetModal>
    </>
  );
}
