"use client";

import EquipmentOnboardingModal from "@/components/onboarding/EquipmentOnboardingModal";
import { readLocalEquipmentOnboardingDone } from "@/lib/equipmentOnboarding";
import { settingsHydrationMatchesAuth } from "@/lib/settingsHydration";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Shows first-run equipment selection once per account (stored in user_settings).
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

  if (
    mode === "loading" ||
    !hydrated ||
    !settingsReady ||
    completed ||
    readLocalEquipmentOnboardingDone()
  ) {
    return null;
  }

  return <EquipmentOnboardingModal />;
}
