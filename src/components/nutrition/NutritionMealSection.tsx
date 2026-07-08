"use client";

import { useState } from "react";
import { toast } from "sonner";
import SurfaceCard from "@/components/common/SurfaceCard";
import AddFoodSheet from "@/components/nutrition/AddFoodSheet";
import NutritionLogEntry from "@/components/nutrition/NutritionLogEntry";
import NutritionMacroSummary from "@/components/nutrition/NutritionMacroSummary";
import type { FoodDiaryMealSummary } from "@/lib/fatsecret/foodDiary";
import { FATSECRET_MEAL_LABELS } from "@/lib/nutrition/fatsecretMeals";
import { removeNutritionDiaryEntry } from "@/hooks/useNutritionDiary";

type Props = {
  summary: FoodDiaryMealSummary;
  dateKey: string;
  onChanged: () => void;
};

export default function NutritionMealSection({ summary, dateKey, onChanged }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:border-accent/40 hover:bg-accent/10"
          >
            Add
          </button>
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

      <AddFoodSheet
        open={addOpen}
        meal={summary.meal}
        dateKey={dateKey}
        onClose={() => setAddOpen(false)}
        onLogged={onChanged}
      />
    </>
  );
}
