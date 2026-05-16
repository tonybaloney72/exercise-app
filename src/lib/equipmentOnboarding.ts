const EQUIPMENT_ONBOARDING_KEY = "exercise-app-equipment-onboarding-done";

export function hasCompletedEquipmentOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(EQUIPMENT_ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function markEquipmentOnboardingCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EQUIPMENT_ONBOARDING_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}
