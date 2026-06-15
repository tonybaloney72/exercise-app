import { describe, expect, it } from "vitest";
import {
  buildNativeOAuthCallbackUrl,
  isNativeOAuthCallbackUrl,
  parseNativeOAuthCallbackUrl,
} from "@/lib/auth/nativeOAuth";

const APP_ID = "dev.myexercise.app";

describe("buildNativeOAuthCallbackUrl", () => {
  it("builds deep link without next for default home", () => {
    expect(buildNativeOAuthCallbackUrl("/today", APP_ID)).toBe(
      "dev.myexercise.app://auth/callback",
    );
  });

  it("includes next for custom return paths", () => {
    expect(buildNativeOAuthCallbackUrl("/weekly", APP_ID)).toBe(
      "dev.myexercise.app://auth/callback?next=%2Fweekly",
    );
  });
});

describe("parseNativeOAuthCallbackUrl", () => {
  it("parses code and next", () => {
    expect(
      parseNativeOAuthCallbackUrl(
        "dev.myexercise.app://auth/callback?code=abc123&next=%2Fweekly",
        APP_ID,
      ),
    ).toEqual({ code: "abc123", next: "/weekly" });
  });

  it("defaults next to app home", () => {
    expect(
      parseNativeOAuthCallbackUrl(
        "dev.myexercise.app://auth/callback?code=abc123",
        APP_ID,
      ),
    ).toEqual({ code: "abc123", next: "/today" });
  });

  it("rejects unrelated deep links", () => {
    expect(
      parseNativeOAuthCallbackUrl("dev.myexercise.app://other/path", APP_ID),
    ).toBeNull();
  });
});

describe("isNativeOAuthCallbackUrl", () => {
  it("matches oauth callback", () => {
    expect(
      isNativeOAuthCallbackUrl(
        "dev.myexercise.app://auth/callback?code=x",
        APP_ID,
      ),
    ).toBe(true);
  });
});
