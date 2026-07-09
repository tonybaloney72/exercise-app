"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import NutritionFactsPanel from "@/components/nutrition/NutritionFactsPanel";
import { resolveApiUrl } from "@/lib/apiBaseUrl";
import type { FoodDetail, FoodServingOption } from "@/lib/fatsecret/foodDetail";
import type { FatSecretFoodSearchItem } from "@/lib/fatsecret/foodsSearch";
import {
  scaleNutrition,
  servingScaleFactor,
} from "@/lib/nutrition/foodNutrition";
import {
  FATSECRET_MEAL_LABELS,
  type FatSecretMeal,
} from "@/lib/nutrition/fatsecretMeals";
import { logFoodDiaryEntry } from "@/hooks/useNutritionDiary";

type Props = {
  open: boolean;
  meal: FatSecretMeal;
  dateKey: string;
  onClose: () => void;
  onLogged: () => void;
};

type Step = "search" | "serving";

export default function AddFoodSheet({
  open,
  meal,
  dateKey,
  onClose,
  onLogged,
}: Props) {
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FatSecretFoodSearchItem[]>([]);
  const [selectedFood, setSelectedFood] =
    useState<FatSecretFoodSearchItem | null>(null);
  const [foodDetail, setFoodDetail] = useState<FoodDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedServingId, setSelectedServingId] = useState<string | null>(
    null,
  );
  const [units, setUnits] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("search");
      setQuery("");
      setResults([]);
      setSelectedFood(null);
      setFoodDetail(null);
      setSelectedServingId(null);
      setUnits("1");
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const handle = window.setTimeout(() => {
      setSearching(true);
      void fetch(
        resolveApiUrl(`/api/nutrition/search?q=${encodeURIComponent(trimmed)}`),
      )
        .then((res) => res.json())
        .then((payload: { foods?: FatSecretFoodSearchItem[] }) => {
          setResults(payload.foods ?? []);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);

    return () => window.clearTimeout(handle);
  }, [open, query]);

  async function pickFood(food: FatSecretFoodSearchItem) {
    setSelectedFood(food);
    setStep("serving");
    setLoadingDetail(true);
    setFoodDetail(null);
    setSelectedServingId(null);
    setUnits("1");

    try {
      const res = await fetch(
        resolveApiUrl(`/api/nutrition/foods/${food.foodId}`),
      );
      const payload = (await res.json()) as FoodDetail | { error?: string };
      if (!res.ok || !("foodId" in payload)) {
        toast.error("Could not load servings for that food.");
        setStep("search");
        return;
      }
      setFoodDetail(payload);
      setSelectedServingId(payload.servings[0]?.servingId ?? null);
      const defaultUnits = payload.servings[0]?.numberOfUnits;
      setUnits(defaultUnits != null ? String(defaultUnits) : "1");
    } catch {
      toast.error("Could not load servings for that food.");
      setStep("search");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleSave() {
    if (!selectedFood || !foodDetail || !selectedServingId) return;
    const numberOfUnits = Number.parseFloat(units.trim());
    if (!Number.isFinite(numberOfUnits) || numberOfUnits <= 0) {
      toast.error("Enter a valid serving amount.");
      return;
    }

    setSaving(true);
    const result = await logFoodDiaryEntry({
      dateKey,
      meal,
      foodId: selectedFood.foodId,
      foodName: selectedFood.name,
      servingId: selectedServingId,
      numberOfUnits,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Food logged");
    onLogged();
    onClose();
  }

  const selectedServing = foodDetail?.servings.find(
    (serving) => serving.servingId === selectedServingId,
  );

  const scaledNutrition = useMemo(() => {
    if (!selectedServing) return null;
    const factor = servingScaleFactor(units, selectedServing.numberOfUnits);
    return scaleNutrition(selectedServing, factor);
  }, [selectedServing, units]);

  const servingLabel = selectedServing
    ? formatServingContext(selectedServing, units)
    : undefined;

  const title =
    step === "search"
      ? `Add to ${FATSECRET_MEAL_LABELS[meal]}`
      : (selectedFood?.name ?? "Choose serving");

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title={title}
      hint={
        step === "search"
          ? "Search FatSecret foods to log."
          : "Pick a serving size and amount."
      }
      placement="center"
      initialFocus="none"
      headerExtra={
        step === "serving" ? (
          <div className="shrink-0 border-b border-border px-4 py-2">
            <button
              type="button"
              onClick={() => setStep("search")}
              disabled={saving}
              className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
            >
              ← Change food
            </button>
          </div>
        ) : undefined
      }
      bodyClassName={
        step === "search"
          ? "overflow-y-auto px-2 py-3 max-h-[min(60vh,420px)]"
          : "overflow-y-auto px-4 py-3 max-h-[min(60vh,420px)]"
      }
      footer={
        step === "serving" ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || loadingDetail || !selectedServingId}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Log food"}
            </button>
          </div>
        ) : undefined
      }
    >
      {step === "search" ? (
        <div className="flex flex-col gap-3 px-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search foods…"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
            autoFocus
          />
          {searching ? <p className="text-sm text-muted">Searching…</p> : null}
          {!searching && query.trim().length >= 2 && results.length === 0 ? (
            <p className="text-sm text-muted">No foods found.</p>
          ) : null}
          <ul className="flex flex-col gap-1">
            {results.map((food) => (
              <li key={food.foodId}>
                <button
                  type="button"
                  onClick={() => void pickFood(food)}
                  className="flex w-full flex-col gap-0.5 rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-left transition-colors hover:border-accent/40"
                >
                  <span className="text-sm font-medium text-foreground">
                    {food.name}
                    {food.brandName ? (
                      <span className="font-normal text-muted">
                        {" "}
                        · {food.brandName}
                      </span>
                    ) : null}
                  </span>
                  {food.description ? (
                    <span className="text-xs text-muted">
                      {food.description}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : loadingDetail ? (
        <p className="text-sm text-muted">Loading servings…</p>
      ) : foodDetail ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Serving</span>
            <select
              value={selectedServingId ?? ""}
              onChange={(event) => {
                const servingId = event.target.value;
                setSelectedServingId(servingId);
                const serving = foodDetail.servings.find(
                  (row) => row.servingId === servingId,
                );
                if (serving) {
                  setUnits(String(serving.numberOfUnits));
                }
              }}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
            >
              {foodDetail.servings.map((serving) => (
                <option key={serving.servingId} value={serving.servingId}>
                  {formatServingLabel(serving)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">
              Amount (units)
            </span>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={units}
              onChange={(event) => setUnits(event.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
            />
          </label>
          {scaledNutrition ? (
            <NutritionFactsPanel
              nutrition={scaledNutrition}
              servingLabel={servingLabel}
            />
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">Could not load servings.</p>
      )}
    </BottomSheetModal>
  );
}

function formatServingLabel(serving: FoodServingOption): string {
  return `${serving.description} - ${Math.round(serving.calories)} kcal`;
}

function formatServingContext(
  serving: FoodServingOption,
  unitsInput: string,
): string {
  const units = Number.parseFloat(unitsInput);
  const unitsLabel =
    Number.isFinite(units) && units > 0 ? String(units) : serving.numberOfUnits;
  const metric =
    serving.metricServingAmount != null && serving.metricServingUnit
      ? ` (${Math.round(serving.metricServingAmount * servingScaleFactor(unitsInput, serving.numberOfUnits))}${serving.metricServingUnit})`
      : "";
  return `${serving.description} · ${unitsLabel} unit${unitsLabel === "1" ? "" : "s"}${metric}`;
}
