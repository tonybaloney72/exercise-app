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
      "Your daily hub-quick-log cardio, body weight, and meals or snacks. Sign in to save nutrition entries.",
  },
  {
    label: "Workout",
    description:
      "Today's training plan, live sessions, and sub-tabs for Week and History.",
  },
  {
    label: "Meals",
    description:
      "Full meal diary: search foods, edit servings, and review everything logged today.",
  },
  {
    label: "Health",
    description:
      "Health Connect metrics, burned vs consumed nutrition, trends, and exercise charts.",
  },
  {
    label: "Settings",
    description:
      "Equipment, skill caps, timers, week builders, exercise library, and app preferences.",
  },
] as const;
