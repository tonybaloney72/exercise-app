import { describe, expect, it } from "vitest";
import {
  isAndroidUserAgent,
  resolveAndroidAppDownloadUrl,
  shouldShowAndroidAppDownload,
  type AndroidAppDownloadEnvironment,
} from "@/lib/androidAppDownload";

function env(
  overrides: Partial<AndroidAppDownloadEnvironment> = {},
): AndroidAppDownloadEnvironment {
  return {
    isNativePlatform: () => false,
    displayModeStandalone: false,
    iosStandalone: false,
    userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36",
    ...overrides,
  };
}

const production = { isDevelopment: false };

describe("shouldShowAndroidAppDownload", () => {
  it("shows in installed Android PWA", () => {
    expect(
      shouldShowAndroidAppDownload(
        env({ displayModeStandalone: true }),
        production,
      ),
    ).toBe(true);
  });

  it("shows in desktop browser during local dev", () => {
    expect(
      shouldShowAndroidAppDownload(
        env({
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }),
        { isDevelopment: true },
      ),
    ).toBe(true);
  });

  it("hides in native Capacitor shell", () => {
    expect(
      shouldShowAndroidAppDownload(
        env({
          isNativePlatform: () => true,
          displayModeStandalone: true,
        }),
        production,
      ),
    ).toBe(false);
  });

  it("hides in normal browser tab in production", () => {
    expect(shouldShowAndroidAppDownload(env(), production)).toBe(false);
  });

  it("hides on iOS home-screen PWA", () => {
    expect(
      shouldShowAndroidAppDownload(
        env({
          iosStandalone: true,
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        }),
        production,
      ),
    ).toBe(false);
  });

  it("hides on desktop installed PWA in production", () => {
    expect(
      shouldShowAndroidAppDownload(
        env({
          displayModeStandalone: true,
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }),
        production,
      ),
    ).toBe(false);
  });
});

describe("isAndroidUserAgent", () => {
  it("detects Android", () => {
    expect(isAndroidUserAgent("Mozilla/5.0 (Linux; Android 14)")).toBe(true);
  });
});

describe("resolveAndroidAppDownloadUrl", () => {
  it("defaults to the in-app download page", () => {
    expect(resolveAndroidAppDownloadUrl()).toBe("/download/android");
  });
});
