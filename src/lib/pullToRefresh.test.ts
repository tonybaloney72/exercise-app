import { describe, expect, it } from "vitest";
import { shouldEnablePullToRefresh } from "@/lib/pullToRefresh";

describe("shouldEnablePullToRefresh", () => {
  it("enables on Capacitor native", () => {
    expect(
      shouldEnablePullToRefresh({
        isNativePlatform: () => true,
        displayModeStandalone: false,
        iosStandalone: false,
      }),
    ).toBe(true);
  });

  it("enables in installed PWA standalone", () => {
    expect(
      shouldEnablePullToRefresh({
        isNativePlatform: () => false,
        displayModeStandalone: true,
        iosStandalone: false,
      }),
    ).toBe(true);
  });

  it("enables on legacy iOS home-screen PWA", () => {
    expect(
      shouldEnablePullToRefresh({
        isNativePlatform: () => false,
        displayModeStandalone: false,
        iosStandalone: true,
      }),
    ).toBe(true);
  });

  it("skips normal browser tabs", () => {
    expect(
      shouldEnablePullToRefresh({
        isNativePlatform: () => false,
        displayModeStandalone: false,
        iosStandalone: false,
      }),
    ).toBe(false);
  });
});
