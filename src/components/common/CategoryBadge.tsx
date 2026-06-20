import { CATEGORIES } from "@/core/catalog";
import type { ExerciseCategory } from "@/types";

interface CategoryBadgeProps {
  category: ExerciseCategory;
  size?: "sm" | "md";
  className?: string;
}

export default function CategoryBadge({
  category,
  size = "sm",
  className = "",
}: CategoryBadgeProps) {
  const meta = CATEGORIES[category];
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full font-medium ${meta.bgColor} ${meta.textColor} ${
        size === "sm" ? "px-1.5 py-0.5 text-[11px] leading-tight" : "px-2.5 py-1 text-xs"
      } ${className}`.trim()}
    >
      {meta.shortName}
    </span>
  );
}
