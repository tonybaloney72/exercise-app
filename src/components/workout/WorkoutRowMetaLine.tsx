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
 * Shared workout row chrome: title, reps or timer target tucked under the name, category + menu.
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
  const trimmedDetail = detailText?.trim() ?? "";
  const inlineDetail = trimmedDetail.length > 0 && !showTimerPill;
  const showTimerPillRow = showTimerPill && timerSeconds > 0;

  return (
    <div className="flex min-w-0 flex-1 py-1">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onNameClick}
            className="w-full text-left"
          >
            <p
              className={`text-sm font-medium leading-tight wrap-break-word ${nameClassName}`}
            >
              {name}
            </p>
            {subName}
            {inlineDetail ? (
              <p className="mt-0.5 text-xs leading-snug text-muted">{trimmedDetail}</p>
            ) : null}
          </button>
          {showTimerPillRow ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <SetTimerPill seconds={timerSeconds} title={timerTitle} />
              {trimmedDetail ? (
                <p className="min-w-0 text-xs leading-snug text-muted">{trimmedDetail}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        {category ? (
          <CategoryBadge category={category} className="shrink-0" />
        ) : null}
        <WorkoutRowOverflowMenu items={menuItems} />
      </div>
    </div>
  );
}
