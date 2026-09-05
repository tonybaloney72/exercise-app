"use client";

import CardioActivityKindToggles from "@/components/workout/CardioActivityKindToggles";
import {
  kindsToActivities,
  normalizeDayPlanCardio,
} from "@/lib/cardioActivities";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { CardioActivityKind, DayPlan } from "@/types";

type Props = {
  plan: DayPlan;
  onChange: (plan: DayPlan) => void;
};

export default function DayPlanCardioEditor({ plan, onChange }: Props) {
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const kinds = (plan.cardioActivities ?? []).map((a) => a.kind);

  function setKinds(nextKinds: CardioActivityKind[]) {
    onChange(
      normalizeDayPlanCardio({
        ...plan,
        cardioActivities: kindsToActivities(nextKinds, availableEquipment),
      }),
    );
  }

  function toggle(kind: CardioActivityKind) {
    const next = kinds.includes(kind)
      ? kinds.filter((k) => k !== kind)
      : [...kinds, kind];
    setKinds(next);
  }

  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface-hover/30 p-3 gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Cardio & endurance
      </p>
      <p className="text-sm text-muted leading-snug">
        Add or remove activities for today&apos;s workout.
      </p>
      <CardioActivityKindToggles
        value={kinds}
        onToggle={toggle}
        disabledTitle="Add equipment in Your equipment"
      />
    </section>
  );
}
