"use client";

import EquipmentPicker from "@/components/settings/EquipmentPicker";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function EquipmentSettingsSection() {
  const mode = useAuthStore((s) => s.mode);
  const settings = useSettingsStore();

  return (
    <>
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
        selected={settings.availableEquipment}
        onChange={(next) =>
          void settings.updateSettings({ availableEquipment: next })
        }
      />
    </>
  );
}
