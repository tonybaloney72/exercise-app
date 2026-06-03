"use client";

import { useCallback, useState } from "react";
import OnboardingWizardModal from "@/components/onboarding/OnboardingWizardModal";
import { isOnboardingDeferredThisSession } from "@/lib/onboardingWizard";
import { settingsHydrationMatchesAuth } from "@/lib/settingsHydration";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Multi-step onboarding (welcome, expertise, equipment, tour, week).
 * Persisted completion: `user_settings.equipment_onboarding_completed` (legacy name).
 */
export default function OnboardingGate() {
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.user?.id);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const hydratedForAuthKey = useSettingsStore((s) => s.hydratedForAuthKey);
  const completed = useSettingsStore((s) => s.equipmentOnboardingCompleted);
  const [deferred, setDeferred] = useState(() => isOnboardingDeferredThisSession());

  const settingsReady = settingsHydrationMatchesAuth(
    mode,
    userId,
    hydratedForAuthKey,
  );

  const handleDeferred = useCallback(() => {
    setDeferred(true);
  }, []);

  if (
    mode === "loading" ||
    !hydrated ||
    !settingsReady ||
    completed ||
    deferred
  ) {
    return null;
  }

  return <OnboardingWizardModal onDeferred={handleDeferred} />;
}
