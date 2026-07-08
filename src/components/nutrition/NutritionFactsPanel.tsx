"use client";

import NutritionDetailsDisclosure from "@/components/nutrition/NutritionDetailsDisclosure";
import type { FoodNutrition } from "@/lib/nutrition/foodNutrition";
import { formatNutritionAmount } from "@/lib/nutrition/formatNutrition";

type Props = {
  nutrition: FoodNutrition;
  servingLabel?: string;
  className?: string;
  density?: "default" | "compact";
};

export default function NutritionFactsPanel({
  nutrition,
  servingLabel,
  className = "",
  density = "default",
}: Props) {
  const compact = density === "compact";

  return (
    <div
      className={`rounded-xl border border-border bg-surface-hover ${
        compact ? "px-2.5 py-2" : "px-3 py-3"
      } ${className}`}
    >
      {servingLabel ? (
        <p className="mb-2 text-xs text-muted">{servingLabel}</p>
      ) : null}

      <dl
        className={`grid grid-cols-2 gap-x-3 gap-y-2 ${compact ? "text-xs" : "text-sm"}`}
      >
        <NutritionRow label="Calories" value={nutrition.calories} unit="kcal" />
        <NutritionRow label="Protein" value={nutrition.proteinG} unit="g" />
        <NutritionRow label="Carbs" value={nutrition.carbsG} unit="g" />
        <NutritionRow label="Fat" value={nutrition.fatG} unit="g" />
      </dl>

      <NutritionDetailsDisclosure
        nutrition={nutrition}
        className={compact ? "mt-2 border-t border-border/80 pt-2" : "mt-3 border-t border-border/80 pt-2"}
      />
    </div>
  );
}

function NutritionRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: "g" | "kcal";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-foreground">
        {formatNutritionAmount(value, unit)}
      </dd>
    </div>
  );
}
