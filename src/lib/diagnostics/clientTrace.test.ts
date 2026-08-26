import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearClientTrace,
  clientTrace,
  formatClientTraceExport,
  getClientTraceEntries,
} from "@/lib/diagnostics/clientTrace";

/** Ensure browser storage APIs exist for persistence tests (Vitest node env). */
function stubBrowserStorage() {
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const api = (map: Map<string, string>) => ({
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  });
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("localStorage", api(local));
  vi.stubGlobal("sessionStorage", api(session));
  return local;
}

describe("clientTrace", () => {
  afterEach(() => {
    clearClientTrace();
  });

  it("records and exports trace entries", () => {
    clientTrace("test", "hello", { step: 1 });
    expect(getClientTraceEntries()).toHaveLength(1);
    expect(getClientTraceEntries()[0]?.event).toBe("hello");
    const exported = formatClientTraceExport();
    expect(exported).toContain('"scope": "test"');
    expect(exported).toContain('"hello"');
  });

  it("redacts sensitive fields", () => {
    clientTrace("auth", "token_seen", {
      access_token: "secret-value",
      workoutId: "abc",
    });
    const entry = getClientTraceEntries()[0];
    expect(entry?.data?.access_token).toBe("[redacted]");
    expect(entry?.data?.workoutId).toBe("abc");
  });

  it("persists entries to localStorage when available", () => {
    const local = stubBrowserStorage();
    clearClientTrace();
    clientTrace("settings", "supabase_load_ok", { branch: "ok" });
    const raw = local.get("exercise-app-client-trace-v1");
    expect(raw).toContain("supabase_load_ok");
    vi.unstubAllGlobals();
  });

  it("clears the buffer", () => {
    clientTrace("test", "one");
    clearClientTrace();
    expect(getClientTraceEntries()).toHaveLength(0);
  });
});
