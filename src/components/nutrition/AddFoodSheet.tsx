"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import NutritionFactsPanel from "@/components/nutrition/NutritionFactsPanel";
import { resolveApiUrl } from "@/lib/apiBaseUrl";
import type { FoodDetail } from "@/lib/fatsecret/foodDetail";
import type { FatSecretFoodSearchItem } from "@/lib/fatsecret/foodsSearch";
import { scaleNutrition } from "@/lib/nutrition/foodNutrition";
import {
  FATSECRET_MEAL_LABELS,
  type FatSecretMeal,
} from "@/lib/nutrition/fatsecretMeals";
import {
  amountInputForServingMultiplier,
  ALL_SERVING_FRACTION_CHIPS,
  convertGramsToWeight,
  convertWeightToGrams,
  defaultFoodServing,
  defaultWeightEntryAmount,
  defaultWeightEntryUnit,
  formatServingSizeLine,
  formatWeightInputAmount,
  nutritionScaleFactorForLog,
  resolveNumberOfUnitsForLog,
  servingFractionChipForMultiplier,
  servingHasMetricWeight,
  type WeightEntryUnit,
  WEIGHT_ENTRY_UNITS,
} from "@/lib/nutrition/servingQuantity";
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
  const [amountInput, setAmountInput] = useState("1");
  const [weightUnit, setWeightUnit] = useState<WeightEntryUnit>("g");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("search");
      setQuery("");
      setResults([]);
      setSelectedFood(null);
      setFoodDetail(null);
      setAmountInput("1");
      setWeightUnit("g");
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

  function resetAmountForServing(
    serving: NonNullable<ReturnType<typeof defaultFoodServing>>,
  ) {
    const unit = defaultWeightEntryUnit(serving);
    setWeightUnit(unit);
    setAmountInput(defaultWeightEntryAmount(serving, unit));
  }

  async function pickFood(food: FatSecretFoodSearchItem) {
    setSelectedFood(food);
    setStep("serving");
    setLoadingDetail(true);
    setFoodDetail(null);

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
      const serving = defaultFoodServing(payload.servings);
      if (serving) {
        resetAmountForServing(serving);
      } else {
        setAmountInput("1");
        setWeightUnit("g");
      }
    } catch {
      toast.error("Could not load servings for that food.");
      setStep("search");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleSave() {
    const serving = foodDetail ? defaultFoodServing(foodDetail.servings) : null;
    if (!selectedFood || !serving) return;

    const numberOfUnits = resolveNumberOfUnitsForLog({
      serving,
      amountInput,
      weightUnit,
    });
    if (numberOfUnits == null) {
      toast.error(
        servingHasMetricWeight(serving)
          ? "Enter a valid weight."
          : "Enter a valid serving amount.",
      );
      return;
    }

    setSaving(true);
    const result = await logFoodDiaryEntry({
      dateKey,
      meal,
      foodId: selectedFood.foodId,
      foodName: selectedFood.name,
      servingId: serving.servingId,
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

  const selectedServing = foodDetail
    ? defaultFoodServing(foodDetail.servings)
    : null;
  const usesWeightEntry =
    selectedServing != null && servingHasMetricWeight(selectedServing);

  const scaledNutrition = useMemo(() => {
    if (!selectedServing) return null;
    const factor = nutritionScaleFactorForLog({
      serving: selectedServing,
      amountInput,
      weightUnit,
    });
    if (factor <= 0) return null;
    return scaleNutrition(selectedServing, factor);
  }, [selectedServing, amountInput, weightUnit]);

  const activeServingMultiplier = useMemo(() => {
    if (!selectedServing) return 0;
    return nutritionScaleFactorForLog({
      serving: selectedServing,
      amountInput,
      weightUnit,
    });
  }, [selectedServing, amountInput, weightUnit]);

  const activeFractionChipId =
    servingFractionChipForMultiplier(activeServingMultiplier)?.id ?? "custom";

  function applyServingMultiplier(multiplier: number) {
    if (!selectedServing) return;
    setAmountInput(
      amountInputForServingMultiplier(selectedServing, multiplier, weightUnit),
    );
  }

  const title =
    step === "search"
      ? `Add to ${FATSECRET_MEAL_LABELS[meal]}`
      : (selectedFood?.name ?? "Log food");

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title={title}
      hint={step === "search" ? "Search FatSecret foods to log." : ""}
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
              ← Back
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
              disabled={saving || loadingDetail || !selectedServing}
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
      ) : foodDetail && selectedServing ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted">Serving size</p>
          <p className="text-sm font-medium text-foreground">
            {formatServingSizeLine(selectedServing)}
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Quick amount</span>
            <select
              value={activeFractionChipId}
              onChange={(event) => {
                const chipId = event.target.value;
                if (chipId === "custom") return;
                const chip = ALL_SERVING_FRACTION_CHIPS.find(
                  (row) => row.id === chipId,
                );
                if (chip) applyServingMultiplier(chip.multiplier);
              }}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
            >
              <option value="custom">Custom amount</option>
              {ALL_SERVING_FRACTION_CHIPS.map((chip) => (
                <option key={chip.id} value={chip.id}>
                  {chip.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">
              {usesWeightEntry ? "Amount" : "Servings"}
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step={usesWeightEntry ? "0.1" : "0.25"}
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
              />
              {usesWeightEntry ? (
                <select
                  value={weightUnit}
                  onChange={(event) => {
                    const nextUnit = event.target.value as WeightEntryUnit;
                    const amount = Number.parseFloat(amountInput.trim());
                    if (Number.isFinite(amount) && amount > 0) {
                      const grams = convertWeightToGrams(amount, weightUnit);
                      setAmountInput(
                        formatWeightInputAmount(
                          convertGramsToWeight(grams, nextUnit),
                        ),
                      );
                    }
                    setWeightUnit(nextUnit);
                  }}
                  className="w-20 rounded-xl border border-border bg-surface px-2 py-2.5 text-sm text-foreground"
                >
                  {WEIGHT_ENTRY_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </label>
          {scaledNutrition ? (
            <NutritionFactsPanel nutrition={scaledNutrition} />
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">Could not load servings.</p>
      )}
    </BottomSheetModal>
  );
}
