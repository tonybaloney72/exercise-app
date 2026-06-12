/** sessionStorage: hide onboarding until the tab/session is closed. */
export const ONBOARDING_DEFERRED_SESSION_KEY =
  "exercise-app-onboarding-deferred";

export const ONBOARDING_STEP_COUNT = 5;

export type OnboardingStepId =
  | "welcome"
  | "expertise"
  | "equipment"
  | "tour"
  | "week";

export const ONBOARDING_STEP_ORDER: OnboardingStepId[] = [
  "welcome",
  "expertise",
  "equipment",
  "tour",
  "week",
];

export function onboardingStepIndex(step: OnboardingStepId): number {
  return ONBOARDING_STEP_ORDER.indexOf(step);
}

function sessionStorageAvailable(): boolean {
  return typeof sessionStorage !== "undefined";
}

export function isOnboardingDeferredThisSession(): boolean {
  if (!sessionStorageAvailable()) return false;
  try {
    return sessionStorage.getItem(ONBOARDING_DEFERRED_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function deferOnboardingThisSession(): void {
  if (!sessionStorageAvailable()) return;
  try {
    sessionStorage.setItem(ONBOARDING_DEFERRED_SESSION_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export const ONBOARDING_TAB_TOUR = [
  {
    label: "Today",
    description:
      "Your workout for the day-start a session, log quick cardio, or track body weight.",
  },
  {
    label: "Week",
    description:
      "See the full Sun–Sat plan, open any day, and build or adjust your week.",
  },
  {
    label: "Progress",
    description:
      "Stats, charts, workout history, and trends including body weight over time.",
  },
  {
    label: "Library",
    description:
      "Browse exercises, set defaults, favorites, and filter by gear and skill level.",
  },
  {
    label: "Settings",
    description:
      "Equipment, difficulty caps, timers, week mode (PPL vs custom), and more.",
  },
] as const;
