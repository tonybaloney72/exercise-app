import { describe, expect, it } from "vitest";
import {
  buildAppVersionPayload,
  shouldForceUpdate,
  shouldPromptSoftUpdate,
} from "@/lib/appVersion";

describe("appVersion", () => {
  it("prompts soft update when build ids differ", () => {
    expect(shouldPromptSoftUpdate("abc", "def")).toBe(true);
    expect(shouldPromptSoftUpdate("abc", "abc")).toBe(false);
  });

  it("forces update only when flag is set and build ids differ", () => {
    expect(shouldForceUpdate("abc", "def", true)).toBe(true);
    expect(shouldForceUpdate("abc", "abc", true)).toBe(false);
    expect(shouldForceUpdate("abc", "def", false)).toBe(false);
  });

  it("builds a version payload from env defaults", () => {
    const payload = buildAppVersionPayload();
    expect(payload.buildId).toBeTruthy();
    expect(payload.version).toBeTruthy();
    expect(payload.message).toContain("MyExercise");
    expect(typeof payload.forceUpdate).toBe("boolean");
    expect(payload.apkDownloadUrl).toContain("myexercise.apk");
  });
});
