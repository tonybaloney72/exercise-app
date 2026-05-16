"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import EquipmentPicker from "@/components/settings/EquipmentPicker";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { markEquipmentOnboardingCompleted } from "@/lib/equipmentOnboarding";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ExerciseEquipment } from "@/types";

type EquipmentOnboardingModalProps = {
  onDone: () => void;
};

export default function EquipmentOnboardingModal({
  onDone,
}: EquipmentOnboardingModalProps) {
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const savedEquipment = useSettingsStore((s) => s.availableEquipment);
  const [selected, setSelected] = useState<ExerciseEquipment[]>(() =>
    savedEquipment.length > 0 ? [...savedEquipment] : [...DEFAULT_AVAILABLE_EQUIPMENT],
  );
  const [saving, setSaving] = useState(false);

  const finish = async (equipment: ExerciseEquipment[]) => {
    setSaving(true);
    try {
      await updateSettings({ availableEquipment: equipment });
      markEquipmentOnboardingCompleted();
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="equipment-onboarding-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl max-h-[min(90vh,640px)] overflow-y-auto"
      >
        <h2
          id="equipment-onboarding-title"
          className="text-lg font-semibold text-foreground"
        >
          What equipment do you have?
        </h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          We use this to filter the exercise library and to build your weekly
          plan. You can change it anytime in Settings. When you add custom
          workouts later, the same gear list will apply.
        </p>

        <div className="mt-4">
          <EquipmentPicker selected={selected} onChange={setSelected} />
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish([...DEFAULT_AVAILABLE_EQUIPMENT])}
            className="order-2 sm:order-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
          >
            Skip for now (bodyweight only)
          </button>
          <button
            type="button"
            disabled={saving || selected.length === 0}
            onClick={() => void finish(selected)}
            className="order-1 sm:order-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
