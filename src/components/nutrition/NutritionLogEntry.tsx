"use client";

import type { FoodDiaryEntry } from "@/lib/fatsecret/foodDiary";
import NutritionDetailsDisclosure from "@/components/nutrition/NutritionDetailsDisclosure";
import NutritionMacroSummary from "@/components/nutrition/NutritionMacroSummary";

type Props = {
  entry: FoodDiaryEntry;
  removing: boolean;
  onRemove: () => void;
};

export default function NutritionLogEntry({ entry, removing, onRemove }: Props) {
  return (
    <li className="border-b border-border/60 px-4 py-2.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
          {entry.description !== entry.name ? (
            <p className="truncate text-xs text-muted">{entry.description}</p>
          ) : null}
          <NutritionMacroSummary macros={entry} className="mt-0.5" />
          <NutritionDetailsDisclosure nutrition={entry} className="mt-1" />
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="shrink-0 pt-0.5 text-xs text-muted transition-colors hover:text-red-400 disabled:opacity-50"
          aria-label={`Remove ${entry.name}`}
        >
          {removing ? "…" : "Remove"}
        </button>
      </div>
    </li>
  );
}
