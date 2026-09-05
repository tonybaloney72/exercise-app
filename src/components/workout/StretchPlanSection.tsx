"use client";

import EmptyState from "@/components/common/EmptyState";
import SurfaceCard from "@/components/common/SurfaceCard";
import WorkoutPlanExerciseRow from "@/components/workout/WorkoutPlanExerciseRow";
import PlanTargetField from "@/components/workout/PlanTargetField";
import WorkoutSectionCard from "@/components/workout/WorkoutSectionCard";
import { exerciseMap } from "@/core/catalog";
import { uiAddChipClass } from "@/lib/uiClasses";
import type { StretchEntry } from "@/types";

interface StretchPlanSectionProps {
  title: string;
  /** Subtitle for non-collapsible sections; collapsible sections show stretch count instead. */
  hint?: string;
  entries: StretchEntry[];
  minCount?: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
  onAdd: () => void;
  onChange: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdateTarget: (index: number, targetReps: string) => void;
}

function stretchCountLabel(count: number): string {
  if (count === 0) return "None";
  return `${count} stretch${count === 1 ? "" : "es"}`;
}

function StretchListBody({
  entries,
  minCount = 0,
  onChange,
  onRemove,
  onUpdateTarget,
}: Pick<
  StretchPlanSectionProps,
  "entries" | "minCount" | "onChange" | "onRemove" | "onUpdateTarget"
>) {
  if (entries.length === 0) {
    return (
      <EmptyState title="No stretches yet." className="px-2 py-3 text-xs" />
    );
  }

  return (
    <>
      {entries.map((entry, index) => {
        const meta = exerciseMap[entry.exerciseId];
        if (!meta) return null;
        const canRemove = entries.length > minCount;
        return (
          <WorkoutPlanExerciseRow
            key={`${entry.exerciseId}-${index}`}
            name={meta.name}
            menuItems={[
              { label: "Change stretch", onClick: () => onChange(index) },
              ...(canRemove
                ? [{ label: "Remove", onClick: () => onRemove(index) }]
                : []),
            ]}
            onNameClick={() => onChange(index)}
          >
            <PlanTargetField
              value={entry.targetReps}
              onChange={(next) => onUpdateTarget(index, next)}
            />
          </WorkoutPlanExerciseRow>
        );
      })}
    </>
  );
}

export default function StretchPlanSection({
  title,
  hint,
  entries,
  minCount = 0,
  collapsible = false,
  defaultOpen = true,
  onAdd,
  onChange,
  onRemove,
  onUpdateTarget,
}: StretchPlanSectionProps) {
  const body = (
    <StretchListBody
      entries={entries}
      minCount={minCount}
      onChange={onChange}
      onRemove={onRemove}
      onUpdateTarget={onUpdateTarget}
    />
  );

  if (collapsible) {
    return (
      <WorkoutSectionCard
        title={title}
        defaultOpen={defaultOpen}
        statusLabel={stretchCountLabel(entries.length)}
        menuItems={[{ label: "Add stretch", onClick: onAdd }]}
      >
        {body}
      </WorkoutSectionCard>
    );
  }

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {hint ? (
            <p className="text-sm text-muted mt-0.5">{hint}</p>
          ) : null}
        </div>
        <button type="button" onClick={onAdd} className={uiAddChipClass}>
          + Add
        </button>
      </div>
      <div className="flex flex-col px-2 py-1 gap-0.5">{body}</div>
    </SurfaceCard>
  );
}
