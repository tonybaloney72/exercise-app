import { describe, expect, it, vi, afterEach } from "vitest";
import { resolveApiUrl, resolveAppOrigin } from "@/lib/apiBaseUrl";

describe("apiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns relative paths on web builds", () => {
    vi.stubEnv("NEXT_PUBLIC_CAPACITOR", "");
    expect(resolveAppOrigin()).toBe("");
    expect(resolveApiUrl("/api/version")).toBe("/api/version");
  });

  it("prefixes production origin on bundled Capacitor builds", () => {
    vi.stubEnv("NEXT_PUBLIC_CAPACITOR", "1");
    vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "https://myexercise.dev");
    expect(resolveAppOrigin()).toBe("https://myexercise.dev");
    expect(resolveApiUrl("/api/auth/guest")).toBe(
      "https://myexercise.dev/api/auth/guest",
    );
  });
});
