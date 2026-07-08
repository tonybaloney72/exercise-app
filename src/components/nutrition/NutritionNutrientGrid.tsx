import type { FoodNutrition } from "@/lib/nutrition/foodNutrition";
import { nutritionDetailFields } from "@/lib/nutrition/foodNutrition";
import { formatNutritionAmount } from "@/lib/nutrition/formatNutrition";

type Props = {
  nutrition: FoodNutrition;
  className?: string;
};

/** Two-column micronutrient grid (macros are shown separately). */
export default function NutritionNutrientGrid({
  nutrition,
  className = "",
}: Props) {
  const detailFields = nutritionDetailFields(nutrition);
  if (detailFields.length === 0) return null;

  return (
    <dl className={`grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs ${className}`.trim()}>
      {detailFields.map((field) => (
        <div key={field.label} className="flex items-baseline justify-between gap-2">
          <dt className="text-muted">{field.label}</dt>
          <dd className="shrink-0 font-medium tabular-nums text-foreground">
            {formatNutritionAmount(field.value, field.unit)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
