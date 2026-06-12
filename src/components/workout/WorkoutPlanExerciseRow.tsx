"use client";

import type { ReactNode } from "react";
import WorkoutRowMetaLine from "@/components/workout/WorkoutRowMetaLine";
import type { WorkoutRowMenuItem } from "@/components/workout/WorkoutRowOverflowMenu";

const LEADING_SPACER = <div className="h-7 w-7 shrink-0" aria-hidden />;

/** Leading column (7) + gap-2 - indent for fields below the title row. */
const CHILD_INDENT = "pl-9";

type Props = {
  name: string;
  detailText?: string | null;
  /** Replaces the session checkbox column (drag handle, spacer, etc.). */
  leading?: ReactNode;
  readOnly?: boolean;
  menuItems?: WorkoutRowMenuItem[];
  onNameClick?: () => void;
  /** Extra controls below the title row (plan editor target field, etc.). */
  children?: ReactNode;
};

export default function WorkoutPlanExerciseRow({
  name,
  detailText,
  leading = LEADING_SPACER,
  readOnly = false,
  menuItems = [],
  onNameClick,
  children,
}: Props) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 items-center self-center">{leading}</div>
        <div className="min-w-0 flex-1">
          <WorkoutRowMetaLine
            name={name}
            readOnly={readOnly}
            dense
            titleAlign="center"
            onNameClick={onNameClick ?? (() => {})}
            menuItems={menuItems}
            detailText={detailText}
          />
        </div>
      </div>
      {children ? (
        <div className={`${CHILD_INDENT} mt-1.5`}>{children}</div>
      ) : null}
    </div>
  );
}
