import { CATEGORIES } from "@/data/categories";
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
      className={`inline-flex items-center rounded-full font-medium ${meta.bgColor} ${meta.textColor} ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      } ${className}`.trim()}
    >
      {meta.shortName}
    </span>
  );
}
