import { describe, expect, it } from "vitest";
import {
  compareSemver,
  semverToAndroidVersionCode,
} from "@/lib/semverVersionCode";

describe("semverVersionCode", () => {
  it("maps semver to Android versionCode", () => {
    expect(semverToAndroidVersionCode("0.9.0")).toBe(900);
    expect(semverToAndroidVersionCode("0.9.1")).toBe(901);
    expect(semverToAndroidVersionCode("0.10.12")).toBe(1012);
  });

  it("compares semver strings", () => {
    expect(compareSemver("0.9.0", "0.9.1")).toBeLessThan(0);
    expect(compareSemver("0.10.0", "0.9.99")).toBeGreaterThan(0);
    expect(compareSemver("0.9.1", "0.9.1")).toBe(0);
  });
});
