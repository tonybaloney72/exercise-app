"use client";

import { useMemo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CategoryBadge from "@/components/common/CategoryBadge";
import { exerciseMap } from "@/data/exercises";
import { sortableSlotId } from "@/lib/reorderRoundExercises";
import type { RoundExercise } from "@/types";

function DragHandle({
  label,
  disabled,
  listeners,
  attributes,
}: {
  label: string;
  disabled: boolean;
  listeners: ReturnType<typeof useSortable>["listeners"];
  attributes: ReturnType<typeof useSortable>["attributes"];
}) {
  return (
    <button
      type="button"
      title={disabled ? "Add another exercise to reorder" : "Drag to reorder"}
      className="mt-0.5 flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-lg border border-border bg-surface text-foreground/70 hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 cursor-grab active:cursor-grabbing"
      aria-label={label}
      disabled={disabled}
      {...attributes}
      {...listeners}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="9" cy="7" r="1.75" />
        <circle cx="15" cy="7" r="1.75" />
        <circle cx="9" cy="12" r="1.75" />
        <circle cx="15" cy="12" r="1.75" />
        <circle cx="9" cy="17" r="1.75" />
        <circle cx="15" cy="17" r="1.75" />
      </svg>
    </button>
  );
}

function SortableExerciseRow({
  id,
  slot,
  canRemove,
  canReorder,
  saving,
  onChange,
  onRemove,
  onUpdateReps,
}: {
  id: string;
  slot: RoundExercise;
  canRemove: boolean;
  canReorder: boolean;
  saving: boolean;
  onChange: () => void;
  onRemove: () => void;
  onUpdateReps: (value: string) => void;
}) {
  const meta = exerciseMap[slot.exerciseId];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: saving || !canReorder });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!meta) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-2 py-3 space-y-2 ${isDragging ? "relative z-10 rounded-lg bg-surface shadow-md ring-1 ring-border" : ""}`}
    >
      <div className="flex items-start gap-2">
        <DragHandle
          label={`Reorder ${meta.name}`}
          disabled={saving || !canReorder}
          listeners={listeners}
          attributes={attributes}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{meta.name}</p>
              <CategoryBadge category={meta.category} size="sm" />
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={onChange}
                className="rounded-lg border border-border px-2 py-1 text-sm font-medium text-foreground hover:bg-surface-hover"
              >
                Change
              </button>
              <button
                type="button"
                disabled={!canRemove}
                onClick={onRemove}
                className="rounded-lg border border-border px-2 py-1 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-40"
                aria-label={`Remove ${meta.name}`}
              >
                Remove
              </button>
            </div>
          </div>
          <label className="mt-2 block">
            <span className="text-sm text-muted">Target</span>
            <input
              type="text"
              value={slot.targetReps}
              onChange={(e) => onUpdateReps(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export interface RoundExerciseSortableListProps {
  roundIndex: number;
  exercises: RoundExercise[];
  saving: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onChangeSlot: (slotIndex: number) => void;
  onRemoveSlot: (slotIndex: number) => void;
  onUpdateReps: (slotIndex: number, targetReps: string) => void;
}

export default function RoundExerciseSortableList({
  roundIndex,
  exercises,
  saving,
  onReorder,
  onChangeSlot,
  onRemoveSlot,
  onUpdateReps,
}: RoundExerciseSortableListProps) {
  const canReorder = exercises.length > 1;
  const sortableIds = useMemo(
    () =>
      exercises.map((slot, slotIndex) =>
        sortableSlotId(roundIndex, slotIndex, slot.exerciseId),
      ),
    [exercises, roundIndex],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = sortableIds.indexOf(String(active.id));
    const toIndex = sortableIds.indexOf(String(over.id));
    if (fromIndex < 0 || toIndex < 0) return;
    onReorder(fromIndex, toIndex);
  };

  if (exercises.length === 0) {
    return (
      <p className="px-2 py-4 text-center text-sm text-muted">
        Add an exercise to build this round.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-border px-2 py-1">
          {exercises.map((slot, slotIndex) => (
            <SortableExerciseRow
              key={sortableIds[slotIndex]}
              id={sortableIds[slotIndex]!}
              slot={slot}
              canRemove={exercises.length > 1}
              canReorder={canReorder}
              saving={saving}
              onChange={() => onChangeSlot(slotIndex)}
              onRemove={() => onRemoveSlot(slotIndex)}
              onUpdateReps={(value) => onUpdateReps(slotIndex, value)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
