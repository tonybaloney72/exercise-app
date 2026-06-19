import { describe, expect, it } from "vitest";
import {
  aggregateDailyHealthSampleTotal,
  aggregatedBucketTotal,
  resolveDailyHealthMetricTotal,
  sumHealthSampleValues,
} from "@/lib/health/healthSampleAggregation";

describe("sumHealthSampleValues", () => {
  it("sums positive delta buckets", () => {
    expect(
      sumHealthSampleValues([{ value: 120 }, { value: 80 }, { value: -1 }]),
    ).toBe(200);
  });
});

describe("aggregateDailyHealthSampleTotal", () => {
  it("uses max when samples are duplicate daily totals", () => {
    expect(
      aggregateDailyHealthSampleTotal([
        { value: 4500, endDate: "2026-05-18T08:00:00.000Z" },
        { value: 4520, endDate: "2026-05-18T12:00:00.000Z" },
        { value: 4500, endDate: "2026-05-18T18:00:00.000Z" },
      ]),
    ).toBe(4520);
  });

  it("sums interval buckets when values are clearly incremental", () => {
    expect(
      aggregateDailyHealthSampleTotal([
        { value: 500, endDate: "2026-05-18T08:00:00.000Z" },
        { value: 800, endDate: "2026-05-18T12:00:00.000Z" },
        { value: 1200, endDate: "2026-05-18T18:00:00.000Z" },
      ]),
    ).toBe(2500);
  });
});

describe("resolveDailyHealthMetricTotal", () => {
  it("prefers sample rollup when aggregate lags", () => {
    expect(
      resolveDailyHealthMetricTotal(
        608,
        [
          { value: 1498, endDate: "2026-05-18T10:00:00.000Z" },
          { value: 1498, endDate: "2026-05-18T18:00:00.000Z" },
        ],
      ),
    ).toBe(1498);
  });

  it("uses aggregate when samples are empty", () => {
    expect(resolveDailyHealthMetricTotal(4200, [])).toBe(4200);
  });
});

describe("aggregatedBucketTotal", () => {
  it("sums HC day buckets", () => {
    expect(
      aggregatedBucketTotal([{ value: 4200 }, { value: 0 }, { value: 300 }]),
    ).toBe(4500);
  });
});
