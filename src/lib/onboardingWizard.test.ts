import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deferOnboardingThisSession,
  isOnboardingDeferredThisSession,
  ONBOARDING_DEFERRED_SESSION_KEY,
  onboardingStepIndex,
} from "@/lib/onboardingWizard";
import { createMemoryStorageMock } from "@/test/memoryStorageMock";

describe("onboardingWizard", () => {
  it("tracks step order", () => {
    expect(onboardingStepIndex("welcome")).toBe(0);
    expect(onboardingStepIndex("week")).toBe(4);
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
