import { afterEach, describe, expect, it } from "vitest";
import {
  clearClientTrace,
  clientTrace,
  formatClientTraceExport,
  getClientTraceEntries,
} from "@/lib/diagnostics/clientTrace";

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

  it("clears the buffer", () => {
    clientTrace("test", "one");
    clearClientTrace();
    expect(getClientTraceEntries()).toHaveLength(0);
  });
});
