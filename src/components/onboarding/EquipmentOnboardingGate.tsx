"use client";

import EquipmentOnboardingModal from "@/components/onboarding/EquipmentOnboardingModal";
import { settingsHydrationMatchesAuth } from "@/lib/settingsHydration";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Shows equipment onboarding when persisted settings say it is incomplete.
 * Signed-in: `user_settings.equipment_onboarding_completed`. Guest: same flag in local settings JSON.
 */
export default function EquipmentOnboardingGate() {
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const hydratedForAuthKey = useSettingsStore((s) => s.hydratedForAuthKey);
  const completed = useSettingsStore((s) => s.equipmentOnboardingCompleted);

  const settingsReady = settingsHydrationMatchesAuth(
    mode,
    userId,
    hydratedForAuthKey,
  );

  if (mode === "loading" || !hydrated || !settingsReady || completed) {
    return null;
  }

  return <EquipmentOnboardingModal />;
}
