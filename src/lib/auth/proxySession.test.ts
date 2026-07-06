import { describe, expect, it } from "vitest";
import {
  isAppShellPath,
  isSoftNavigationRequest,
  shouldUseSessionOnlyAuth,
} from "@/lib/auth/proxySession";

function mockRequest(headers: Record<string, string>) {
  return {
    headers: {
      get(name: string) {
        return headers[name] ?? null;
      },
    },
  } as import("next/server").NextRequest;
}

describe("proxySession", () => {
  it("detects RSC and prefetch soft navigation", () => {
    expect(isSoftNavigationRequest(mockRequest({ RSC: "1" }))).toBe(true);
    expect(
      isSoftNavigationRequest(mockRequest({ "Next-Router-Prefetch": "1" })),
    ).toBe(true);
    expect(isSoftNavigationRequest(mockRequest({}))).toBe(false);
  });

  it("classifies app shell paths", () => {
    expect(isAppShellPath("/workout")).toBe(true);
    expect(isAppShellPath("/workout/history")).toBe(true);
    expect(isAppShellPath("/login")).toBe(false);
    expect(isAppShellPath("/")).toBe(false);
  });

  it("uses session-only auth on soft in-app navigation", () => {
    expect(
      shouldUseSessionOnlyAuth(mockRequest({ RSC: "1" }), "/workout/week"),
    ).toBe(true);
    expect(
      shouldUseSessionOnlyAuth(mockRequest({}), "/workout/week"),
    ).toBe(false);
    expect(
      shouldUseSessionOnlyAuth(mockRequest({ RSC: "1" }), "/login"),
    ).toBe(false);
  });
});
