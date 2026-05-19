const LEGACY_EQUIPMENT_ONBOARDING_KEY = "exercise-app-equipment-onboarding-done";

/** Old localStorage flag (pre user_settings column). */
export function readLegacyLocalEquipmentOnboardingDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LEGACY_EQUIPMENT_ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearLegacyLocalEquipmentOnboardingFlag(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_EQUIPMENT_ONBOARDING_KEY);
  } catch {
    /* ignore */
  }
}
