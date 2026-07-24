"use client";

import EquipmentPicker from "@/components/settings/EquipmentPicker";
import WeightInventoryEditor from "@/components/settings/WeightInventoryEditor";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function EquipmentSettingsSection() {
  const mode = useAuthStore((s) => s.mode);
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const weightInventory = useSettingsStore((s) => s.weightInventory);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted">
        {mode === "guest" && (
          <>
            As a guest, equipment changes regenerate this device&apos;s current
            week in memory only (not saved across devices). Sign in to persist
            your week.{" "}
          </>
        )}
        Library and weekly plan only show exercises you can do with gear you
        have.
      </p>
      <EquipmentPicker
        selected={availableEquipment}
        onChange={(next) => void updateSettings({ availableEquipment: next })}
      />
      <WeightInventoryEditor
        availableEquipment={availableEquipment}
        inventory={weightInventory ?? {}}
        onChange={(next) => void updateSettings({ weightInventory: next })}
      />
    </div>
  );
}
