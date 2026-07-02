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

  it("sums interval buckets when values are clearly incremental", () => {
    expect(
      aggregateDailyHealthSampleTotal([
        { value: 500, endDate: "2026-05-18T08:00:00.000Z" },
        { value: 800, endDate: "2026-05-18T12:00:00.000Z" },
        { value: 1200, endDate: "2026-05-18T18:00:00.000Z" },
      ]),
    ).toBe(2500);
  });

  it("does not add jog intervals on top of end-of-day cumulative total", () => {
    expect(
      aggregateDailyHealthSampleTotal([
        { value: 400, endDate: "2026-07-02T08:00:00.000Z", sourceName: "Nothing X" },
        { value: 600, endDate: "2026-07-02T09:00:00.000Z", sourceName: "Nothing X" },
        { value: 700, endDate: "2026-07-02T09:30:00.000Z", sourceName: "Nothing X" },
        { value: 1111, endDate: "2026-07-02T10:00:00.000Z", sourceName: "Nothing X" },
        { value: 3378, endDate: "2026-07-02T17:00:00.000Z", sourceName: "Nothing X" },
      ]),
    ).toBe(3378);
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

  it("prefers deduped samples when aggregate sums duplicate snapshots", () => {
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

  it("prefers samples when aggregate undercounts partial day total", () => {
    expect(
      resolveDailyHealthMetricTotal(
        1268,
        [
          {
            value: 2795,
            sourceName: "Samsung Health",
            endDate: "2026-07-02T17:00:00.000Z",
          },
          {
            value: 2770,
            sourceName: "Anthony's S23+",
            endDate: "2026-07-02T17:00:00.000Z",
          },
        ],
      ),
    ).toBe(2795);
  });
});

describe("aggregatedBucketTotal", () => {
  it("sums distinct HC day buckets", () => {
    expect(
      aggregatedBucketTotal([{ value: 4200 }, { value: 0 }, { value: 300 }]),
    ).toBe(4500);
  });

  it("dedupes similar buckets from multiple sources", () => {
    expect(
      aggregatedBucketTotal([{ value: 1498 }, { value: 1500 }]),
    ).toBe(1500);
  });

  it("does not sum daily cumulative bucket with jog-sized bucket", () => {
    expect(aggregatedBucketTotal([{ value: 3378 }, { value: 2411 }])).toBe(3378);
  });

  it("still sums partial HC day segments", () => {
    expect(aggregatedBucketTotal([{ value: 1156 }, { value: 1639 }])).toBe(2795);
  });
});

describe("resolveDailyHealthMetricTotal jog double-count", () => {
  it("clamps when aggregate and samples both sum cumulative plus jog", () => {
    expect(
      resolveDailyHealthMetricTotal(
        5789,
        [
          { value: 3378, endDate: "2026-07-02T17:00:00.000Z", sourceName: "Nothing X" },
          { value: 2411, endDate: "2026-07-02T10:00:00.000Z", sourceName: "Nothing X" },
        ],
      ),
    ).toBe(3378);
  });
});
