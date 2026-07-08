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
    label: "Home",
    description:
      "Quick capture for today—log cardio activities and body weight without starting a workout.",
  },
  {
    label: "Workout",
    description:
      "Today's training plan, live sessions, week view, and workout history.",
  },
  {
    label: "Meals",
    description:
      "Search foods and log breakfast, lunch, dinner, and snacks for the day.",
  },
  {
    label: "Health",
    description:
      "Health Connect metrics, nutrition analysis, exercise trends, and body weight charts.",
  },
  {
    label: "Settings",
    description:
      "Equipment, difficulty caps, timers, week builders, library, and app preferences.",
  },
] as const;
