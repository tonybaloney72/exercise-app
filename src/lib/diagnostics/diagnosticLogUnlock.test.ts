import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_UNLOCK_TAP_COUNT,
  DIAGNOSTIC_UNLOCK_TAP_WINDOW_MS,
  registerDiagnosticUnlockTap,
} from "@/lib/diagnostics/diagnosticLogUnlock";

describe("registerDiagnosticUnlockTap", () => {
  it("triggers after enough taps within the window", () => {
    const start = 1_000_000;
    let timestamps: number[] = [];
    let triggered = false;
    for (let i = 0; i < DIAGNOSTIC_UNLOCK_TAP_COUNT - 1; i += 1) {
      const result = registerDiagnosticUnlockTap(timestamps, start + i * 100);
      timestamps = result.timestamps;
      triggered = result.triggered;
    }
    expect(triggered).toBe(false);
    const final = registerDiagnosticUnlockTap(
      timestamps,
      start + (DIAGNOSTIC_UNLOCK_TAP_COUNT - 1) * 100,
    );
    expect(final.triggered).toBe(true);
  });

  it("resets when taps are outside the window", () => {
    const start = 2_000_000;
    const stale = Array.from(
      { length: DIAGNOSTIC_UNLOCK_TAP_COUNT - 1 },
      (_, i) => start + i * 100,
    );
    const result = registerDiagnosticUnlockTap(
      stale,
      start + DIAGNOSTIC_UNLOCK_TAP_WINDOW_MS + 1_000,
    );
    expect(result.triggered).toBe(false);
    expect(result.timestamps).toHaveLength(1);
  });
});
