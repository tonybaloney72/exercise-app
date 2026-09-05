"use client";

import CardioActivityKindToggles from "@/components/workout/CardioActivityKindToggles";
import type { CardioActivityKind } from "@/types";

type Props = {
  value: CardioActivityKind[];
  onChange: (next: CardioActivityKind[]) => void;
};

export default function DayBlueprintCardioEditor({ value, onChange }: Props) {
  function toggleKind(kind: CardioActivityKind) {
    const next = value.includes(kind)
      ? value.filter((k) => k !== kind)
      : [...value, kind];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted">
        Cardio & endurance (optional)
      </p>
      <CardioActivityKindToggles value={value} onToggle={toggleKind} />
    </div>
  );
}
