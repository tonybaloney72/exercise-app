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

describe("shouldShowAndroidAppDownload", () => {
  it("shows in installed Android PWA", () => {
    expect(
      shouldShowAndroidAppDownload(
        env({ displayModeStandalone: true }),
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
      ),
    ).toBe(false);
  });

  it("hides in normal browser tab", () => {
    expect(shouldShowAndroidAppDownload(env())).toBe(false);
  });

  it("hides on iOS home-screen PWA", () => {
    expect(
      shouldShowAndroidAppDownload(
        env({
          iosStandalone: true,
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        }),
      ),
    ).toBe(false);
  });

  it("hides on desktop installed PWA", () => {
    expect(
      shouldShowAndroidAppDownload(
        env({
          displayModeStandalone: true,
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }),
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
  it("defaults to production download path", () => {
    expect(resolveAndroidAppDownloadUrl()).toBe(
      "https://myexercise.dev/downloads/myexercise.apk",
    );
  });
});
