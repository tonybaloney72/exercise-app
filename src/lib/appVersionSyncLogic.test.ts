import { describe, expect, it } from "vitest";
import {
  evaluateVersionPrompt,
  needsNativeApkUpdate,
  needsWebBuildUpdate,
} from "@/lib/appVersionSyncLogic";
import type { AppVersionPayload } from "@/lib/appVersion";

function payload(
  overrides: Partial<AppVersionPayload> = {},
): AppVersionPayload {
  return {
    buildId: "server-web",
    version: "0.9.0",
    forceUpdate: false,
    message: "A new version of MyExercise is available.",
    apkDownloadUrl: "https://myexercise.dev/downloads/myexercise.apk",
    apkBuildId: "0.9.0",
    ...overrides,
  };
}

describe("appVersionSyncLogic", () => {
  it("detects stale web bundles", () => {
    expect(needsWebBuildUpdate("old-web", "server-web")).toBe(true);
    expect(needsWebBuildUpdate("server-web", "server-web")).toBe(false);
  });

  it("detects stale native APK installs", () => {
    expect(needsNativeApkUpdate("0.8.0", "0.9.0")).toBe(true);
    expect(needsNativeApkUpdate("0.9.0", "0.9.0")).toBe(false);
    expect(needsNativeApkUpdate(null, "0.9.0")).toBe(false);
  });

  it("prompts native APK download when only the APK is behind", () => {
    const result = evaluateVersionPrompt({
      clientWebBuildId: "server-web",
      installedNativeApkBuildId: "0.8.0",
      payload: payload(),
      isNativeShell: true,
    });

    expect(result.showSoft).toBe(true);
    expect(result.nativeApkUpdate).toBe(true);
    expect(result.webUpdate).toBe(false);
    expect(result.preferApkDownload).toBe(true);
  });

  it("prompts reload on native when only the web bundle is behind", () => {
    const result = evaluateVersionPrompt({
      clientWebBuildId: "old-web",
      installedNativeApkBuildId: "0.9.0",
      payload: payload(),
      isNativeShell: true,
    });

    expect(result.showSoft).toBe(true);
    expect(result.webUpdate).toBe(true);
    expect(result.nativeApkUpdate).toBe(false);
    expect(result.preferApkDownload).toBe(true);
  });
});
