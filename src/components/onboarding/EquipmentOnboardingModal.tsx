"use client";

import { useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import EquipmentPicker from "@/components/settings/EquipmentPicker";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ExerciseEquipment } from "@/types";

export default function EquipmentOnboardingModal() {
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const savedEquipment = useSettingsStore((s) => s.availableEquipment);
  const [selected, setSelected] = useState<ExerciseEquipment[]>(() =>
    savedEquipment.length > 0 ? [...savedEquipment] : [...DEFAULT_AVAILABLE_EQUIPMENT],
  );
  const [saving, setSaving] = useState(false);

  const finish = async (equipment: ExerciseEquipment[]) => {
    setSaving(true);
    try {
      await updateSettings({
        availableEquipment: equipment,
        equipmentOnboardingCompleted: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheetModal
      open
      onClose={() => {}}
      closeOnBackdropClick={false}
      closeOnEscape={false}
      showCloseButton={false}
      title="What equipment do you have?"
      titleClassName="text-lg"
      hint="We use this to filter the exercise library and to build your weekly plan. You can change it anytime in Settings. When you add custom workouts later, the same gear list will apply."
      hintClassName="text-sm leading-relaxed"
      ariaLabel="Equipment onboarding"
      maxWidth="lg"
      panelClassName="max-h-[min(90vh,640px)]"
      bodyClassName="overflow-y-auto px-4 py-4"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
      }
    >
      <EquipmentPicker selected={selected} onChange={setSelected} />
    </BottomSheetModal>
  );
}
