import type { MacroTotals } from "@/lib/nutrition/foodNutrition";
import { formatMacroShort, formatMacroSummary } from "@/lib/nutrition/formatNutrition";

type Props = {
  macros: MacroTotals;
  variant?: "full" | "short";
  className?: string;
};

/** Compact protein / carbs / fat line for diary rows and meal headers. */
export default function NutritionMacroSummary({
  macros,
  variant = "full",
  className = "",
}: Props) {
  const text =
    variant === "short" ? formatMacroShort(macros) : formatMacroSummary(macros);

  return (
    <p className={`text-xs tabular-nums text-muted ${className}`.trim()}>
      {text}
    </p>
  );
}
