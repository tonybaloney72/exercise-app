import type { ReactNode } from "react";
import SurfaceCard from "@/components/common/SurfaceCard";
import NutritionMacroSummary from "@/components/nutrition/NutritionMacroSummary";
import NutritionNutrientGrid from "@/components/nutrition/NutritionNutrientGrid";
import type { FoodNutrition } from "@/lib/nutrition/foodNutrition";
import { nutritionDetailFields } from "@/lib/nutrition/foodNutrition";

type Props = {
  title: string;
  nutrition: FoodNutrition;
  children?: ReactNode;
};

export default function NutritionTotalsPanel({ title, nutrition, children }: Props) {
  const hasMacros = nutrition.calories > 0;
  const hasMicros = nutritionDetailFields(nutrition).length > 0;
  if (!hasMacros && !hasMicros) return null;

  return (
    <SurfaceCard className="flex flex-col gap-2 p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {hasMacros ? (
        <NutritionMacroSummary macros={nutrition} variant="short" />
      ) : null}
      <NutritionNutrientGrid nutrition={nutrition} />
      {children}
    </SurfaceCard>
  );
}
