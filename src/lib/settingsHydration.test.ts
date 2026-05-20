import { describe, expect, it } from "vitest";
import {
  settingsHydrationKey,
  settingsHydrationMatchesAuth,
} from "@/lib/settingsHydration";

describe("settingsHydration", () => {
  it("builds per-user keys for authenticated mode", () => {
    expect(settingsHydrationKey("authenticated", "abc")).toBe("user:abc");
    expect(settingsHydrationKey("authenticated", null)).toBeNull();
  });

  it("matches only when hydrated key equals current auth", () => {
    expect(
      settingsHydrationMatchesAuth(
        "authenticated",
        "abc",
        "user:abc",
      ),
    ).toBe(true);
    expect(
      settingsHydrationMatchesAuth(
        "authenticated",
        "xyz",
        "user:abc",
      ),
    ).toBe(false);
    expect(
      settingsHydrationMatchesAuth("anonymous", null, "anonymous"),
    ).toBe(true);
    expect(
      settingsHydrationMatchesAuth(
        "authenticated",
        "abc",
        "anonymous",
      ),
    ).toBe(false);
  });
});
