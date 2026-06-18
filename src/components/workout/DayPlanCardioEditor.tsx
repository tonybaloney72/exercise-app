"use client";

import {
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  cardioKindAllowed,
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
        Add or remove activities for today's workout.
      </p>
      <span className="flex flex-wrap gap-1">
        {CARDIO_ACTIVITY_ORDER.map((kind) => {
          const enabled = kinds.includes(kind);
          const allowed = cardioKindAllowed(kind, availableEquipment);
          return (
            <button
              key={kind}
              type="button"
              disabled={!allowed}
              onClick={() => toggle(kind)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                enabled
                  ? "bg-accent text-white"
                  : "border border-border bg-background text-foreground hover:border-accent/40"
              }`}
            >
              {CARDIO_ACTIVITY_LABELS[kind]}
            </button>
          );
        })}
      </span>
    </section>
  );
}
