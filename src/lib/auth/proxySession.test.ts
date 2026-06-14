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
    expect(isAppShellPath("/today")).toBe(true);
    expect(isAppShellPath("/progress/history")).toBe(true);
    expect(isAppShellPath("/login")).toBe(false);
    expect(isAppShellPath("/")).toBe(false);
  });

  it("uses session-only auth on soft in-app navigation", () => {
    expect(
      shouldUseSessionOnlyAuth(mockRequest({ RSC: "1" }), "/weekly"),
    ).toBe(true);
    expect(
      shouldUseSessionOnlyAuth(mockRequest({}), "/weekly"),
    ).toBe(false);
    expect(
      shouldUseSessionOnlyAuth(mockRequest({ RSC: "1" }), "/login"),
    ).toBe(false);
  });
});
