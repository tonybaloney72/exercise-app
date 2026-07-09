"use client";

import { useState } from "react";
import type { FoodNutrition } from "@/lib/nutrition/foodNutrition";
import { nutritionDetailFields } from "@/lib/nutrition/foodNutrition";
import NutritionNutrientGrid from "@/components/nutrition/NutritionNutrientGrid";

type Props = {
  nutrition: FoodNutrition;
  className?: string;
};

/** Expandable micronutrient list - macros are shown elsewhere. */
export default function NutritionDetailsDisclosure({
  nutrition,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const detailFields = nutritionDetailFields(nutrition);
  if (detailFields.length === 0) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-xs font-medium text-accent hover:underline"
        aria-expanded={open}
      >
        {open ? "Hide details" : "More details"}
      </button>
      {open ? (
        <NutritionNutrientGrid nutrition={nutrition} className="mt-1.5" />
      ) : null}
    </div>
  );
}
