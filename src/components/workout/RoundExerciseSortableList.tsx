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
import WorkoutPlanExerciseRow from "@/components/workout/WorkoutPlanExerciseRow";
import PlanTargetField from "@/components/workout/PlanTargetField";
import { exerciseMap } from "@/core/catalog";
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
      className="flex h-10 w-10 shrink-0 touch-none items-center justify-center rounded-md border-2 border-border bg-transparent text-foreground/50 transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-grab active:cursor-grabbing"
      aria-label={label}
      disabled={disabled}
      {...attributes}
      {...listeners}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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

  const menuItems = [
    { label: "Change exercise", onClick: onChange },
    ...(canRemove
      ? [{ label: "Remove from round", onClick: onRemove }]
      : []),
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "relative z-10 rounded-lg bg-surface shadow-md ring-1 ring-border" : ""}
    >
      <WorkoutPlanExerciseRow
        name={meta.name}
        leading={
          <DragHandle
            label={`Reorder ${meta.name}`}
            disabled={saving || !canReorder}
            listeners={listeners}
            attributes={attributes}
          />
        }
        menuItems={menuItems}
        onNameClick={onChange}
      >
        <PlanTargetField value={slot.targetReps} onChange={onUpdateReps} />
      </WorkoutPlanExerciseRow>
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
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
      </SortableContext>
    </DndContext>
  );
}
