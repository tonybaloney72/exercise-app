"use client";

import { CATEGORIES, CATEGORY_ORDER } from "@/core/catalog";
import type { ExerciseCategory } from "@/types";

const chipRowClass =
  "flex gap-2 overflow-x-auto pb-1 scrollbar-hide";

type CategoryFilterChipsBaseProps = {
  categories?: readonly ExerciseCategory[];
  className?: string;
  /** When set, wraps chips in a labeled filter row (library-style). */
  label?: string;
  hint?: string;
};

type CategoryFilterChipsMultipleProps = CategoryFilterChipsBaseProps & {
  mode: "multiple";
  selected: Set<ExerciseCategory>;
  onSelectedChange: (selected: Set<ExerciseCategory>) => void;
};

type CategoryFilterChipsSingleProps = CategoryFilterChipsBaseProps & {
  mode: "single";
  selected: ExerciseCategory | null;
  onSelectedChange: (selected: ExerciseCategory | null) => void;
};

export type CategoryFilterChipsProps =
  | CategoryFilterChipsMultipleProps
  | CategoryFilterChipsSingleProps;

function toggleMultipleCategory(
  prev: Set<ExerciseCategory>,
  cat: ExerciseCategory,
): Set<ExerciseCategory> {
  const next = new Set(prev);
  if (next.has(cat)) next.delete(cat);
  else next.add(cat);
  return next;
}

export default function CategoryFilterChips(props: CategoryFilterChipsProps) {
  const {
    categories = CATEGORY_ORDER,
    className,
    label,
    hint,
    mode,
    selected,
    onSelectedChange,
  } = props;

  const allSelected =
    mode === "multiple"
      ? selected.size === 0
      : selected === null;

  function selectAll() {
    if (mode === "multiple") {
      onSelectedChange(new Set());
    } else {
      onSelectedChange(null);
    }
  }

  function selectCategory(cat: ExerciseCategory) {
    if (mode === "multiple") {
      onSelectedChange(toggleMultipleCategory(selected, cat));
      return;
    }
    onSelectedChange(selected === cat ? null : cat);
  }

  const chips = (
    <>
      <button
        type="button"
        onClick={selectAll}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          allSelected
            ? "bg-accent text-white"
            : "bg-surface text-muted hover:text-foreground border border-border"
        }`}
      >
        All
      </button>
      {categories.map((cat) => {
        const isSelected =
          mode === "multiple" ? selected.has(cat) : selected === cat;
        return (
          <button
            key={cat}
            type="button"
            aria-pressed={isSelected}
            onClick={() => selectCategory(cat)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isSelected
                ? `${CATEGORIES[cat].bgColor} ${CATEGORIES[cat].textColor}`
                : "bg-surface text-muted hover:text-foreground border border-border"
            }`}
          >
            {CATEGORIES[cat].shortName}
          </button>
        );
      })}
    </>
  );

  if (label) {
    return (
      <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
        <p className="text-sm font-medium text-muted px-1">
          {label}
          {hint ? (
            <span className="font-normal text-muted/80"> {hint}</span>
          ) : null}
        </p>
        <div className={`${chipRowClass} -mx-4 px-4`}>{chips}</div>
      </div>
    );
  }

  return (
    <div className={`${chipRowClass} ${className ?? ""}`}>{chips}</div>
  );
}
