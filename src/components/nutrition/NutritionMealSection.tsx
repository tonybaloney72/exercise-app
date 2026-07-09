"use client";

import { useState } from "react";
import { toast } from "sonner";
import SurfaceCard from "@/components/common/SurfaceCard";
import AddFoodSheet from "@/components/nutrition/AddFoodSheet";
import BarcodeScanSheet from "@/components/nutrition/BarcodeScanSheet";
import NutritionLogEntry from "@/components/nutrition/NutritionLogEntry";
import NutritionMacroSummary from "@/components/nutrition/NutritionMacroSummary";
import { removeNutritionDiaryEntry } from "@/hooks/useNutritionDiary";
import { useAndroidNative } from "@/hooks/useAndroidNative";
import type { FoodDetail } from "@/lib/fatsecret/foodDetail";
import type { FoodDiaryMealSummary } from "@/lib/fatsecret/foodDiary";
import { FATSECRET_MEAL_LABELS } from "@/lib/nutrition/fatsecretMeals";

type Props = {
  summary: FoodDiaryMealSummary;
  dateKey: string;
  onChanged: () => void;
};

type AddSheetState = {
  initialFood?: FoodDetail;
};

export default function NutritionMealSection({ summary, dateKey, onChanged }: Props) {
  const [addSheet, setAddSheet] = useState<AddSheetState | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const androidNative = useAndroidNative();

  async function handleRemove(entryId: string) {
    setRemovingId(entryId);
    const result = await removeNutritionDiaryEntry(entryId);
    setRemovingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  const hasEntries = summary.entries.length > 0;

  return (
    <>
      <SurfaceCard className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              {FATSECRET_MEAL_LABELS[summary.meal]}
            </h2>
            {hasEntries ? (
              <NutritionMacroSummary
                macros={summary}
                className="mt-0.5"
              />
            ) : (
              <p className="mt-0.5 text-xs text-muted">Nothing logged yet.</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {androidNative ? (
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10"
              >
                Scan
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setAddSheet({})}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:border-accent/40 hover:bg-accent/10"
            >
              Add
            </button>
          </div>
        </div>

        {hasEntries ? (
          <ul>
            {summary.entries.map((entry) => (
              <NutritionLogEntry
                key={entry.entryId}
                entry={entry}
                removing={removingId === entry.entryId}
                onRemove={() => void handleRemove(entry.entryId)}
              />
            ))}
          </ul>
        ) : null}
      </SurfaceCard>

      {addSheet ? (
        <AddFoodSheet
          key={`${summary.meal}-${addSheet.initialFood?.foodId ?? "search"}`}
          open
          meal={summary.meal}
          dateKey={dateKey}
          initialFood={addSheet.initialFood ?? null}
          onClose={() => setAddSheet(null)}
          onLogged={onChanged}
        />
      ) : null}

      {scanOpen ? (
        <BarcodeScanSheet
          open
          defaultMeal={summary.meal}
          onClose={() => setScanOpen(false)}
          onFoodResolved={(_meal, food) => {
            setScanOpen(false);
            setAddSheet({ initialFood: food });
          }}
          onSearchInstead={() => {
            setScanOpen(false);
            setAddSheet({});
          }}
        />
      ) : null}
    </>
  );
}
