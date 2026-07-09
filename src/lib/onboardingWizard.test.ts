import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deferOnboardingThisSession,
  isOnboardingDeferredThisSession,
  ONBOARDING_DEFERRED_SESSION_KEY,
  ONBOARDING_TAB_TOUR,
  onboardingStepIndex,
} from "@/lib/onboardingWizard";
import { createMemoryStorageMock } from "@/test/memoryStorageMock";

describe("onboardingWizard", () => {
  it("tracks step order", () => {
    expect(onboardingStepIndex("welcome")).toBe(0);
    expect(onboardingStepIndex("week")).toBe(4);
  });

  it("describes the five main tabs", () => {
    expect(ONBOARDING_TAB_TOUR).toHaveLength(5);
    expect(ONBOARDING_TAB_TOUR.map((tab) => tab.label)).toEqual([
      "Home",
      "Workout",
      "Meals",
      "Health",
      "Settings",
    ]);
  });

  describe("session defer", () => {
    beforeEach(() => {
      vi.stubGlobal("sessionStorage", createMemoryStorageMock());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("defers onboarding for the session", () => {
      expect(isOnboardingDeferredThisSession()).toBe(false);
      deferOnboardingThisSession();
      expect(sessionStorage.getItem(ONBOARDING_DEFERRED_SESSION_KEY)).toBe("1");
      expect(isOnboardingDeferredThisSession()).toBe(true);
    });
  });
});
