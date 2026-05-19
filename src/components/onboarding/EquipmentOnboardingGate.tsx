"use client";

import EquipmentOnboardingModal from "@/components/onboarding/EquipmentOnboardingModal";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Shows first-run equipment selection once per account (stored in user_settings).
 */
export default function EquipmentOnboardingGate() {
  const mode = useAuthStore((s) => s.mode);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const completed = useSettingsStore((s) => s.equipmentOnboardingCompleted);

  if (mode === "loading" || !hydrated || completed) {
    return null;
  }

  return <EquipmentOnboardingModal />;
}
