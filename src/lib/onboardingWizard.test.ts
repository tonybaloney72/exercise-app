import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deferOnboardingThisSession,
  isOnboardingDeferredThisSession,
  ONBOARDING_DEFERRED_SESSION_KEY,
  onboardingStepIndex,
} from "@/lib/onboardingWizard";

describe("onboardingWizard", () => {
  it("tracks step order", () => {
    expect(onboardingStepIndex("welcome")).toBe(0);
    expect(onboardingStepIndex("week")).toBe(4);
  });

  describe("session defer", () => {
    const store = new Map<string, string>();

    beforeEach(() => {
      store.clear();
      vi.stubGlobal("sessionStorage", {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => store.clear(),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("defers onboarding for the session", () => {
      expect(isOnboardingDeferredThisSession()).toBe(false);
      deferOnboardingThisSession();
      expect(store.get(ONBOARDING_DEFERRED_SESSION_KEY)).toBe("1");
      expect(isOnboardingDeferredThisSession()).toBe(true);
    });
  });
});
