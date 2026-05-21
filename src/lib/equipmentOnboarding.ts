const LEGACY_EQUIPMENT_ONBOARDING_KEY = "exercise-app-equipment-onboarding-done";
const EQUIPMENT_ONBOARDING_DONE_KEY = "exercise-app-equipment-onboarding-v2-done";

/** Old localStorage flag (pre user_settings column). */
export function readLegacyLocalEquipmentOnboardingDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LEGACY_EQUIPMENT_ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

/** Client flag so onboarding does not re-open after refresh before settings sync. */
export function readLocalEquipmentOnboardingDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem(EQUIPMENT_ONBOARDING_DONE_KEY) === "1" ||
      readLegacyLocalEquipmentOnboardingDone()
    );
  } catch {
    return false;
  }
}

export function markLocalEquipmentOnboardingDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EQUIPMENT_ONBOARDING_DONE_KEY, "1");
    localStorage.removeItem(LEGACY_EQUIPMENT_ONBOARDING_KEY);
  } catch {
    /* ignore */
  }
}

export function clearLegacyLocalEquipmentOnboardingFlag(): void {
  markLocalEquipmentOnboardingDone();
}
