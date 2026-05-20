"use client";

import type { ReactNode } from "react";
import CategoryBadge from "@/components/common/CategoryBadge";
import type { ExerciseCategory } from "@/types";
import SetTimerPill from "./SetTimerPill";
import WorkoutRowOverflowMenu, {
  type WorkoutRowMenuItem,
} from "./WorkoutRowOverflowMenu";

interface WorkoutRowMetaLineProps {
  name: ReactNode;
  nameClassName?: string;
  subName?: ReactNode;
  onNameClick: () => void;
  category?: ExerciseCategory;
  menuItems: WorkoutRowMenuItem[];
  /** Reps target, logged result, etc. Omit when timer pill carries the target. */
  detailText?: string | null;
  showTimerPill?: boolean;
  timerSeconds?: number;
  timerTitle?: string;
}

/**
 * Shared workout row chrome: title + optional category + menu, then one detail line.
 */
export default function WorkoutRowMetaLine({
  name,
  nameClassName = "text-foreground",
  subName,
  onNameClick,
  category,
  menuItems,
  detailText,
  showTimerPill = false,
  timerSeconds = 45,
  timerTitle,
}: WorkoutRowMetaLineProps) {
  const hasDetail =
    Boolean(detailText?.trim()) || (showTimerPill && timerSeconds > 0);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onNameClick}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={`text-sm font-medium leading-snug wrap-break-word ${nameClassName}`}
          >
            {name}
          </p>
          {subName}
        </button>
        {category ? (
          <CategoryBadge category={category} className="shrink-0" />
        ) : null}
        <WorkoutRowOverflowMenu items={menuItems} />
      </div>

      {hasDetail ? (
        <div className="flex min-w-0 items-center gap-2">
          {showTimerPill ? (
            <SetTimerPill seconds={timerSeconds} title={timerTitle} />
          ) : null}
          {detailText?.trim() ? (
            <p className="min-w-0 text-xs leading-relaxed text-muted">
              {detailText}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
