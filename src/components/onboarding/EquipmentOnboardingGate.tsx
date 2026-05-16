"use client";

import { useState } from "react";
import EquipmentOnboardingModal from "@/components/onboarding/EquipmentOnboardingModal";
import { hasCompletedEquipmentOnboarding } from "@/lib/equipmentOnboarding";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Shows first-run equipment selection after settings load (guest or signed-in).
 */
export default function EquipmentOnboardingGate() {
  const mode = useAuthStore((s) => s.mode);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const [dismissed, setDismissed] = useState(() =>
    hasCompletedEquipmentOnboarding(),
  );

  if (mode === "loading" || !hydrated || dismissed) {
    return null;
  }

  return (
    <EquipmentOnboardingModal
      onDone={() => setDismissed(true)}
    />
  );
}
