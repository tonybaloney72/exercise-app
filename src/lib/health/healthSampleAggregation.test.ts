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

  it("dedupes similar totals from separate HC sources", () => {
    expect(
      aggregateDailyHealthSampleTotal([
        {
          value: 1498,
          sourceName: "Samsung Health",
          endDate: "2026-05-18T12:00:00.000Z",
        },
        {
          value: 1500,
          sourceName: "Anthony's S23+",
          endDate: "2026-05-18T12:00:00.000Z",
        },
      ]),
    ).toBe(1500);
  });

  it("dedupes per-source interval sums from two HC sources", () => {
    const samsung = [100, 200, 400, 300, 498].map((value, index) => ({
      value,
      sourceName: "com.sec.android.app.shealth",
      endDate: `2026-06-19T${10 + index}:00:00.000Z`,
    }));
    const phone = [100, 200, 400, 300, 500].map((value, index) => ({
      value,
      sourceName: "samsung SM-S916U1",
      endDate: `2026-06-19T${10 + index}:00:00.000Z`,
    }));
    expect(aggregateDailyHealthSampleTotal([...samsung, ...phone])).toBe(1500);
  });

  it("uses lower total when overlapping writers disagree", () => {
    expect(
      aggregateDailyHealthSampleTotal([
        {
          value: 2795,
          sourceName: "Nothing Watch",
          endDate: "2026-06-20T10:00:00.000Z",
        },
        {
          value: 5789,
          sourceName: "android",
          endDate: "2026-06-20T12:00:00.000Z",
        },
      ]),
    ).toBe(2795);
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
  it("prefers aggregate when it matches HC deduped multi-source total", () => {
    expect(
      resolveDailyHealthMetricTotal(
        1498,
        [
          {
            value: 1498,
            sourceName: "Samsung Health",
            endDate: "2026-05-18T10:00:00.000Z",
          },
          {
            value: 1500,
            sourceName: "Anthony's S23+",
            endDate: "2026-05-18T18:00:00.000Z",
          },
        ],
      ),
    ).toBe(1498);
  });

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

  it("prefers deduped samples when aggregate doubles multi-source totals", () => {
    expect(
      resolveDailyHealthMetricTotal(
        2998,
        [
          {
            value: 1498,
            sourceName: "Samsung Health",
            endDate: "2026-06-19T10:00:00.000Z",
          },
          {
            value: 1500,
            sourceName: "Anthony's S23+",
            endDate: "2026-06-19T18:00:00.000Z",
          },
        ],
      ),
    ).toBe(1500);
  });

  it("prefers deduped samples when aggregate doubles duplicate snapshots", () => {
    expect(
      resolveDailyHealthMetricTotal(
        2998,
        [
          { value: 1498, endDate: "2026-06-19T10:00:00.000Z" },
          { value: 1498, endDate: "2026-06-19T18:00:00.000Z" },
        ],
      ),
    ).toBe(1498);
  });

  it("prefers deduped samples when aggregate is partial", () => {
    const samples = [
      ...[100, 200, 400, 300, 498].map((value, index) => ({
        value,
        sourceName: "com.sec.android.app.shealth",
        endDate: `2026-06-19T${10 + index}:00:00.000Z`,
      })),
      ...[100, 200, 400, 300, 500].map((value, index) => ({
        value,
        sourceName: "samsung SM-S916U1",
        endDate: `2026-06-19T${10 + index}:00:00.000Z`,
      })),
    ];
    expect(resolveDailyHealthMetricTotal(657, samples)).toBe(1500);
  });
});

describe("aggregatedBucketTotal", () => {
  it("dedupes overlapping per-source day buckets toward the lower HC total", () => {
    expect(
      aggregatedBucketTotal([{ value: 4200 }, { value: 0 }, { value: 300 }]),
    ).toBe(4200);
    expect(
      aggregatedBucketTotal([{ value: 2333 }, { value: 2633 }]),
    ).toBe(2633);
    expect(
      aggregatedBucketTotal([{ value: 2795 }, { value: 5789 }]),
    ).toBe(2795);
  });

  it("dedupes similar buckets from multiple sources", () => {
    expect(
      aggregatedBucketTotal([{ value: 1498 }, { value: 1500 }]),
    ).toBe(1500);
  });
});

describe("resolveDailyHealthMetricTotal — multi-writer daily steps", () => {
  it("uses max across buckets that previously summed to ~2× HC (2333 + 2633)", () => {
    const buckets = [{ value: 2333 }, { value: 2633 }];
    expect(aggregatedBucketTotal(buckets)).toBe(2633);
    expect(resolveDailyHealthMetricTotal(aggregatedBucketTotal(buckets), [])).toBe(
      2633,
    );
  });

  it("prefers HC aggregate when sample rollup over-counts overlapping sources", () => {
    expect(
      resolveDailyHealthMetricTotal(
        2633,
        [
          {
            value: 2483,
            sourceName: "Nothing Watch",
            endDate: "2026-06-20T10:00:00.000Z",
          },
          {
            value: 4966,
            sourceName: "android",
            endDate: "2026-06-20T12:00:00.000Z",
          },
        ],
      ),
    ).toBe(2633);
  });

  it("resolves inflated aggregate toward HC when writers disagree (~2795 vs ~5789)", () => {
    const samples = [
      {
        value: 2795,
        sourceName: "Nothing Watch",
        endDate: "2026-06-20T10:00:00.000Z",
      },
      {
        value: 5789,
        sourceName: "android",
        endDate: "2026-06-20T12:00:00.000Z",
      },
    ];
    expect(resolveDailyHealthMetricTotal(5789, samples)).toBe(2795);
    expect(
      resolveDailyHealthMetricTotal(aggregatedBucketTotal(samples), samples),
    ).toBe(2795);
  });
});
