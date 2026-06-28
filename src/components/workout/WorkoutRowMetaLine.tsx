"use client";

import type { ReactNode } from "react";
import SetTimerPill from "./SetTimerPill";
import WorkoutRowOverflowMenu, {
  type WorkoutRowMenuItem,
} from "./WorkoutRowOverflowMenu";
import ExpandChevron from "./ExpandChevron";
import { WORKOUT_COMPLETION_CHECKBOX_WIDTH_CLASS } from "./WorkoutCompletionCheckbox";

interface WorkoutRowMetaLineProps {
  /** Leading control (e.g. completion checkbox) — row 1 only, vertically centered. */
  leading?: ReactNode;
  name: ReactNode;
  nameClassName?: string;
  subName?: ReactNode;
  /** Static label (preview / plan edit) - no expand button on the title. */
  readOnly?: boolean;
  /** Tighter row for plan editor / preview lists. */
  dense?: boolean;
  /** Vertical alignment of title row with overflow menu. */
  titleAlign?: "start" | "center";
  /** When true, name tap opens a detail sheet (dialog semantics). */
  opensDetailSheet?: boolean;
  onNameClick: () => void;
  /** When set, shows a chevron control that toggles expand/collapse (same as name tap). */
  expanded?: boolean;
  onToggleExpand?: () => void;
  menuItems: WorkoutRowMenuItem[];
  /** Reps target, logged result, etc. Omit when timer pill carries the target. */
  detailText?: string | null;
  /** Left side of the detail row (e.g. set timer pill). */
  detailLeading?: ReactNode;
  /** Inline controls on the detail row (e.g. completed reps/duration during workout). */
  detailTrailing?: ReactNode;
  showTimerPill?: boolean;
  timerSeconds?: number;
  timerTitle?: string;
}

function NameBlock({
  name,
  nameClassName,
  subName,
  readOnly,
  opensDetailSheet = false,
  onNameClick,
}: {
  name: ReactNode;
  nameClassName: string;
  subName?: ReactNode;
  readOnly: boolean;
  opensDetailSheet?: boolean;
  onNameClick: () => void;
}) {
  const title = (
    <p
      className={`text-sm font-medium leading-tight wrap-break-word ${nameClassName}`}
    >
      {name}
    </p>
  );

  if (readOnly) {
    return (
      <div className="w-full min-w-0 text-left">
        {title}
        {subName}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onNameClick}
      aria-haspopup={opensDetailSheet ? "dialog" : undefined}
      className="w-full min-w-0 text-left py-2"
    >
      {title}
      {subName}
    </button>
  );
}

/**
 * Shared workout row chrome: title, reps or timer target tucked under the name, overflow menu.
 */
export default function WorkoutRowMetaLine({
  leading,
  name,
  nameClassName = "text-foreground",
  subName,
  readOnly = false,
  dense = false,
  titleAlign = "start",
  opensDetailSheet = false,
  onNameClick,
  expanded = false,
  onToggleExpand,
  menuItems,
  detailText,
  detailLeading,
  detailTrailing,
  showTimerPill = false,
  timerSeconds = 45,
  timerTitle,
}: WorkoutRowMetaLineProps) {
  const trimmedDetail = detailText?.trim() ?? "";
  const inlineDetail =
    trimmedDetail.length > 0 && !showTimerPill && !detailLeading;
  const splitDetailRow = detailTrailing != null;
  const showDetailRow =
    splitDetailRow && (detailLeading != null || inlineDetail);
  const showTimerPillRow = showTimerPill && timerSeconds > 0 && !splitDetailRow;

  const toggleExpand = onToggleExpand ?? onNameClick;
  const rowAlign = titleAlign === "center" ? "items-center" : "items-start";

  const chevronButton = onToggleExpand ? (
    <button
      type="button"
      onClick={toggleExpand}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse details" : "Expand details"}
      className="shrink-0 rounded-md p-0.5 text-muted hover:bg-surface-hover hover:text-foreground"
    >
      <ExpandChevron open={expanded} />
    </button>
  ) : null;

  const overflowMenu = <WorkoutRowOverflowMenu items={menuItems} />;

  if (splitDetailRow) {
    return (
      <div className={`min-w-0 flex-1 ${dense ? "" : "py-1"}`}>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center justify-between">
            <div className="shrink-0">{overflowMenu}</div>
            <NameBlock
              name={name}
              nameClassName={nameClassName}
              subName={subName}
              readOnly={readOnly}
              opensDetailSheet={opensDetailSheet}
              onNameClick={onNameClick}
            />
            {chevronButton ? (
              <div className="shrink-0 flex items-center mr-2">
                {chevronButton}
              </div>
            ) : null}
            {leading ? <div>{leading}</div> : null}
          </div>
          {showDetailRow ? (
            <div className="flex min-w-0 items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                {leading ? (
                  <div
                    className={`${WORKOUT_COMPLETION_CHECKBOX_WIDTH_CLASS} shrink-0`}
                    aria-hidden
                  />
                ) : null}
                <div className="flex min-w-0 flex-1 items-center">
                  {detailLeading ??
                    (inlineDetail ? (
                      <p className="min-w-0 text-xs leading-snug text-muted">
                        {trimmedDetail}
                      </p>
                    ) : null)}
                </div>
              </div>
              <div className="shrink-0">{detailTrailing}</div>
            </div>
          ) : null}
          {showTimerPillRow ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 pl-5 md:pl-7">
              <SetTimerPill seconds={timerSeconds} title={timerTitle} />
              {trimmedDetail ? (
                <p className="min-w-0 text-xs leading-snug text-muted">
                  {trimmedDetail}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const detailRow = showDetailRow ? (
    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {inlineDetail ? (
        <p className="text-xs leading-snug text-muted">{trimmedDetail}</p>
      ) : null}
    </div>
  ) : null;

  return (
    <div className={`flex min-w-0 flex-1 ${dense ? "" : "py-1"}`}>
      <div
        className={`flex min-w-0 flex-1 gap-2 ${leading ? "items-center" : rowAlign}`}
      >
        {leading ? <div className="shrink-0 self-center">{leading}</div> : null}
        {chevronButton ? (
          <div
            className={
              leading || titleAlign === "center" ? "self-center" : "mt-0.5"
            }
          >
            {chevronButton}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <NameBlock
            name={name}
            nameClassName={nameClassName}
            subName={subName}
            readOnly={readOnly}
            opensDetailSheet={opensDetailSheet}
            onNameClick={onNameClick}
          />
          {detailRow}
          {showTimerPillRow ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <SetTimerPill seconds={timerSeconds} title={timerTitle} />
              {trimmedDetail ? (
                <p className="min-w-0 text-xs leading-snug text-muted">
                  {trimmedDetail}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className={titleAlign === "center" ? "self-center" : undefined}>
          {overflowMenu}
        </div>
      </div>
    </div>
  );
}
