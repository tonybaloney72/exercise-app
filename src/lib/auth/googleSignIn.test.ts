import { describe, expect, it } from "vitest";
import { buildOAuthCallbackUrl } from "@/lib/auth/googleSignIn";
import { APP_HOME } from "@/lib/auth/constants";

describe("buildOAuthCallbackUrl", () => {
  it("builds callback without next when returnTo is default home", () => {
    expect(buildOAuthCallbackUrl("https://myexercise.dev", APP_HOME)).toBe(
      "https://myexercise.dev/auth/callback",
    );
  });

  it("includes next for custom return paths", () => {
    expect(
      buildOAuthCallbackUrl("https://myexercise.dev", "/workout/week"),
    ).toBe("https://myexercise.dev/auth/callback?next=%2Fworkout%2Fweek");
  });
});
