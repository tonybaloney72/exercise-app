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
import { useAndroidNative } from "@/hooks/useAndroidNative";
import type { UsualFoodItem } from "@/lib/fatsecret/foodUsual";
import { fetchFoodByBarcode } from "@/lib/nutrition/barcodeLookup";
import {
  BarcodeScanCancelledError,
  BarcodeScanUnavailableError,
  isBarcodeScanCancelled,
  scanProductBarcode,
} from "@/lib/nutrition/barcodeScan";
import {
  fetchUsualFoods,
  setFoodFavorite,
} from "@/lib/nutrition/usualFoodsClient";

type Props = {
  open: boolean;
  meal: FatSecretMeal;
  dateKey: string;
  onClose: () => void;
  onLogged: () => void;
  /** Skip search when food is already resolved (e.g. barcode scan). */
  initialFood?: FoodDetail | null;
};

type Step = "search" | "serving";

export default function AddFoodSheet({
  open,
  meal,
  dateKey,
  onClose,
  onLogged,
  initialFood = null,
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
  const [saveAction, setSaveAction] = useState<"log" | "addAnother" | null>(
    null,
  );
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [manualBarcodeOpen, setManualBarcodeOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [usualFoods, setUsualFoods] = useState<UsualFoodItem[]>([]);
  const [usualLoading, setUsualLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const androidNative = useAndroidNative();
  const saving = saveAction != null;
  const showUsual =
    step === "search" && !initialFood && query.trim().length < 2;

  function resetAmountForServing(
    serving: NonNullable<ReturnType<typeof defaultFoodServing>>,
  ) {
    const unit = defaultWeightEntryUnit(serving);
    setWeightUnit(unit);
    setAmountInput(defaultWeightEntryAmount(serving, unit));
  }

  function openServingForFoodDetail(food: FoodDetail) {
    setSelectedFood({
      foodId: food.foodId,
      name: food.name,
      brandName: food.brandName,
      foodType: food.foodType,
      description: null,
      url: null,
    });
    setFoodDetail(food);
    setStep("serving");
    setLoadingDetail(false);
    const serving = defaultFoodServing(food.servings);
    if (serving) {
      resetAmountForServing(serving);
    } else {
      setAmountInput("1");
      setWeightUnit("g");
    }
  }

  function resetToSearch() {
    setStep("search");
    setQuery("");
    setResults([]);
    setSelectedFood(null);
    setFoodDetail(null);
    setAmountInput("1");
    setWeightUnit("g");
    setSaveAction(null);
    setBarcodeBusy(false);
    setManualBarcodeOpen(false);
    setManualBarcode("");
    setFavoriteBusy(false);
  }

  useEffect(() => {
    if (!open) {
      resetToSearch();
      setUsualFoods([]);
      setFavoriteIds(new Set());
      setUsualLoading(false);
      return;
    }
    if (initialFood) {
      openServingForFoodDetail(initialFood);
    }
    setUsualLoading(true);
    void fetchUsualFoods(meal)
      .then((result) => {
        if (!result.ok) {
          setUsualFoods([]);
          setFavoriteIds(new Set());
          return;
        }
        setUsualFoods(result.foods);
        setFavoriteIds(
          new Set(
            result.foods
              .filter((food) => food.isFavorite)
              .map((food) => food.foodId),
          ),
        );
      })
      .finally(() => setUsualLoading(false));
  }, [open, initialFood, meal]);

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

  async function lookupBarcodeFood(code: string) {
    const result = await fetchFoodByBarcode(code);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    openServingForFoodDetail(result.food);
  }

  async function handleScanBarcode() {
    setBarcodeBusy(true);
    try {
      const code = await scanProductBarcode();
      await lookupBarcodeFood(code);
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
      setBarcodeBusy(false);
    }
  }

  async function handleManualBarcodeLookup() {
    const code = manualBarcode.trim();
    if (!code) {
      toast.error("Enter a barcode number.");
      return;
    }
    setBarcodeBusy(true);
    try {
      await lookupBarcodeFood(code);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Barcode lookup failed.",
      );
    } finally {
      setBarcodeBusy(false);
    }
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

  async function pickUsualFood(food: UsualFoodItem) {
    await pickFood({
      foodId: food.foodId,
      name: food.name,
      brandName: food.brandName,
      foodType: food.foodType,
      description: food.description,
      url: null,
    });
  }

  async function toggleFavorite() {
    if (!selectedFood || favoriteBusy) return;
    const nextFavorite = !favoriteIds.has(selectedFood.foodId);
    const serving = foodDetail ? defaultFoodServing(foodDetail.servings) : null;
    setFavoriteBusy(true);
    const result = await setFoodFavorite({
      foodId: selectedFood.foodId,
      favorite: nextFavorite,
      servingId: serving?.servingId ?? null,
      numberOfUnits: serving?.numberOfUnits ?? null,
    });
    setFavoriteBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (nextFavorite) next.add(selectedFood.foodId);
      else next.delete(selectedFood.foodId);
      return next;
    });
    setUsualFoods((current) => {
      if (nextFavorite) {
        // Only star rows already in this meal's Usual (most-eaten); don't append.
        return current.map((row) =>
          row.foodId === selectedFood.foodId
            ? { ...row, isFavorite: true }
            : row,
        );
      }
      return current.map((row) =>
        row.foodId === selectedFood.foodId
          ? { ...row, isFavorite: false }
          : row,
      );
    });
    toast.success(nextFavorite ? "Added to favorites" : "Removed from favorites");
  }

  async function saveEntry(
    action: "log" | "addAnother",
  ): Promise<boolean> {
    const serving = foodDetail ? defaultFoodServing(foodDetail.servings) : null;
    if (!selectedFood || !serving) return false;

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
      return false;
    }

    setSaveAction(action);
    const result = await logFoodDiaryEntry({
      dateKey,
      meal,
      foodId: selectedFood.foodId,
      foodName: selectedFood.name,
      servingId: serving.servingId,
      numberOfUnits,
    });
    setSaveAction(null);

    if (!result.ok) {
      toast.error(result.error);
      return false;
    }

    toast.success("Food logged");
    onLogged();
    return true;
  }

  async function handleLog() {
    if (!(await saveEntry("log"))) return;
    onClose();
  }

  async function handleAddAnother() {
    if (!(await saveEntry("addAnother"))) return;
    resetToSearch();
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
      hint={
        step === "search"
          ? androidNative
            ? "Search by name or scan a barcode."
            : "Search FatSecret foods to log."
          : ""
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
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleAddAnother()}
                disabled={saving || loadingDetail || !selectedServing}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground hover:border-accent/40 disabled:opacity-60"
              >
                {saveAction === "addAnother" ? "Adding…" : "Add Another"}
              </button>
              <button
                type="button"
                onClick={() => void handleLog()}
                disabled={saving || loadingDetail || !selectedServing}
                className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-60"
              >
                {saveAction === "log" ? "Logging…" : "Log"}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-muted hover:text-foreground disabled:opacity-60"
            >
              Cancel
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
            disabled={barcodeBusy}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground disabled:opacity-50"
            autoFocus
          />
          {androidNative ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleScanBarcode()}
                disabled={barcodeBusy}
                className="w-full rounded-xl border border-border bg-surface-hover py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 disabled:opacity-50"
              >
                {barcodeBusy ? "Looking up…" : "Scan barcode"}
              </button>
              {manualBarcodeOpen ? (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted">
                    Barcode number
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={manualBarcode}
                    onChange={(event) => setManualBarcode(event.target.value)}
                    placeholder="e.g. 0041570054161"
                    disabled={barcodeBusy}
                    className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => void handleManualBarcodeLookup()}
                    disabled={barcodeBusy}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:border-accent/40 disabled:opacity-50"
                  >
                    Look up barcode
                  </button>
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => setManualBarcodeOpen(true)}
                  disabled={barcodeBusy}
                  className="self-start text-xs font-medium text-accent hover:underline disabled:opacity-50"
                >
                  Type barcode instead
                </button>
              )}
            </div>
          ) : null}
          {showUsual ? (
            <div className="flex flex-col gap-1.5">
              <p className="px-1 text-xs font-medium text-muted">Usual</p>
              {usualLoading ? (
                <p className="px-1 text-sm text-muted">Loading…</p>
              ) : usualFoods.length === 0 ? (
                <p className="px-1 text-sm text-muted">
                  Foods you eat often and favorites will show up here.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {usualFoods.map((food) => (
                    <li key={food.foodId}>
                      <button
                        type="button"
                        onClick={() => void pickUsualFood(food)}
                        disabled={barcodeBusy}
                        className="flex w-full flex-col gap-0.5 rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-left transition-colors hover:border-accent/40 disabled:opacity-50"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {food.isFavorite ? "★ " : null}
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
              )}
            </div>
          ) : null}
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
                  disabled={barcodeBusy}
                  className="flex w-full flex-col gap-0.5 rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-left transition-colors hover:border-accent/40 disabled:opacity-50"
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
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={() => void toggleFavorite()}
              disabled={saving || favoriteBusy}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-accent/40 disabled:opacity-50"
            >
              {favoriteBusy
                ? "Updating…"
                : favoriteIds.has(selectedFood?.foodId ?? "")
                  ? "★ Favorited"
                  : "☆ Favorite"}
            </button>
          </div>
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
