"use client";

import EmptyState from "@/components/common/EmptyState";
import SurfaceCard from "@/components/common/SurfaceCard";
import { exerciseMap } from "@/data/exercises";
import type { StretchEntry } from "@/types";

interface StretchPlanSectionProps {
  title: string;
  hint: string;
  entries: StretchEntry[];
  minCount?: number;
  onAdd: () => void;
  onChange: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdateTarget: (index: number, targetReps: string) => void;
}

export default function StretchPlanSection({
  title,
  hint,
  entries,
  minCount = 0,
  onAdd,
  onChange,
  onRemove,
  onUpdateTarget,
}: StretchPlanSectionProps) {
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-[11px] text-muted mt-0.5">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-hover"
        >
          + Add
        </button>
      </div>
      <div className="divide-y divide-border px-2 py-1">
        {entries.length === 0 ? (
          <EmptyState title="No stretches yet." className="px-2 py-4 text-xs" />
        ) : (
          entries.map((entry, index) => {
            const meta = exerciseMap[entry.exerciseId];
            if (!meta) return null;
            return (
              <div key={`${entry.exerciseId}-${index}`} className="px-2 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{meta.name}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => onChange(index)}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-hover"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      disabled={entries.length <= minCount}
                      onClick={() => onRemove(index)}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <label className="block">
                  <span className="text-[11px] text-muted">Target</span>
                  <input
                    type="text"
                    value={entry.targetReps}
                    onChange={(e) => onUpdateTarget(index, e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  />
                </label>
              </div>
            );
          })
        )}
      </div>
    </SurfaceCard>
  );
}
