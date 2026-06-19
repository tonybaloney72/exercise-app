import { describe, expect, it } from "vitest";
import {
  computeCardioPaceMetrics,
  formatCardioPaceSummary,
} from "@/lib/health/cardioPaceMetrics";

describe("cardioPaceMetrics", () => {
  it("computes pace and speed from ME distance + duration", () => {
    const metrics = computeCardioPaceMetrics(1, 600);
    expect(metrics).toEqual({ avgSpeedMph: 6, paceLabel: "10:00/mi" });
    expect(formatCardioPaceSummary(1, 600)).toBe("10:00/mi · 6 mph");
  });
});
