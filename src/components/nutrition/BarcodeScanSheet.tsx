"use client";

import { useState } from "react";
import { toast } from "sonner";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import { resolveApiUrl } from "@/lib/apiBaseUrl";
import type { FoodDetail } from "@/lib/fatsecret/foodDetail";
import {
  BarcodeScanCancelledError,
  BarcodeScanUnavailableError,
  isBarcodeScanCancelled,
  scanProductBarcode,
} from "@/lib/nutrition/barcodeScan";
import {
  FATSECRET_MEALS,
  FATSECRET_MEAL_LABELS,
  type FatSecretMeal,
} from "@/lib/nutrition/fatsecretMeals";

type Props = {
  open: boolean;
  defaultMeal?: FatSecretMeal;
  onClose: () => void;
  onFoodResolved: (meal: FatSecretMeal, food: FoodDetail) => void;
  onSearchInstead?: (meal: FatSecretMeal) => void;
};

export default function BarcodeScanSheet({
  open,
  defaultMeal = "breakfast",
  onClose,
  onFoodResolved,
  onSearchInstead,
}: Props) {
  const [meal, setMeal] = useState<FatSecretMeal>(defaultMeal);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");

  async function lookupBarcode(code: string) {
    const res = await fetch(
      resolveApiUrl(`/api/nutrition/barcode?code=${encodeURIComponent(code)}`),
    );
    const payload = (await res.json()) as FoodDetail | { error?: string };
    if (!res.ok || !("foodId" in payload)) {
      toast.error(
        payload && "error" in payload && payload.error
          ? payload.error
          : "Could not look up that barcode.",
      );
      return;
    }
    onFoodResolved(meal, payload);
    onClose();
  }

  async function handleScan() {
    setBusy(true);
    try {
      const code = await scanProductBarcode();
      await lookupBarcode(code);
    } catch (err) {
      if (err instanceof BarcodeScanCancelledError || isBarcodeScanCancelled(err)) {
        return;
      }
      if (err instanceof BarcodeScanUnavailableError) {
        toast.error(err.message);
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Barcode scan failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleManualLookup() {
    const code = manualCode.trim();
    if (!code) {
      toast.error("Enter a barcode number.");
      return;
    }
    setBusy(true);
    try {
      await lookupBarcode(code);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Barcode lookup failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title="Scan barcode"
      hint="Point your camera at a product barcode. Android app only."
      placement="center"
      initialFocus="none"
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleScan()}
            disabled={busy}
            className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-60"
          >
            {busy ? "Looking up…" : "Scan barcode"}
          </button>
          {onSearchInstead ? (
            <button
              type="button"
              onClick={() => {
                onSearchInstead(meal);
                onClose();
              }}
              disabled={busy}
              className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
            >
              Search by name instead
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Log to</span>
          <select
            value={meal}
            onChange={(event) => setMeal(event.target.value as FatSecretMeal)}
            disabled={busy}
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground disabled:opacity-50"
          >
            {FATSECRET_MEALS.map((option) => (
              <option key={option} value={option}>
                {FATSECRET_MEAL_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs leading-relaxed text-muted">
          Uses Google Play barcode scanning. No food in FatSecret for a barcode?
          Try search by name instead.
        </p>
        {manualOpen ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Barcode number</span>
            <input
              type="text"
              inputMode="numeric"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="e.g. 4006381333931"
              disabled={busy}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void handleManualLookup()}
              disabled={busy}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-accent/40 disabled:opacity-50"
            >
              Look up barcode
            </button>
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            disabled={busy}
            className="self-start text-xs font-medium text-accent hover:underline disabled:opacity-50"
          >
            Type barcode instead
          </button>
        )}
      </div>
    </BottomSheetModal>
  );
}
