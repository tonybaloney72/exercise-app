import { describe, expect, it } from "vitest";
import {
  buildChartDayAxis,
  buildChartSessionAxis,
  formatLocalDateKeyChartLabel,
  parseLocalDateKey,
  parseLocalDateKeyMs,
  sortByChartSortKey,
} from "@/utils/localDateKey";

describe("parseLocalDateKey", () => {
  it("parses valid local date keys and rejects invalid ones", () => {
    const parsed = parseLocalDateKey("2026-05-16");
    expect(parsed).not.toBeNull();
    expect(parsed!.getFullYear()).toBe(2026);
    expect(parsed!.getMonth()).toBe(4);
    expect(parsed!.getDate()).toBe(16);

    expect(parseLocalDateKey("2026-13-01")).toBeNull();
    expect(parseLocalDateKey("not-a-date")).toBeNull();
  });
});

describe("localDateKey chart helpers", () => {
  it("builds day axis labels and sort keys", () => {
    expect(buildChartDayAxis("2026-06-20")).toEqual({
      xLabel: "6/20",
      sortKey: parseLocalDateKeyMs("2026-06-20"),
    });
    expect(formatLocalDateKeyChartLabel("2026-06-20")).toBe("6/20");
  });

  it("builds session axis labels for same-day sessions", () => {
    expect(buildChartSessionAxis("2026-06-20", 1)).toEqual({
      xLabel: "6/20",
      sortKey: parseLocalDateKeyMs("2026-06-20"),
      sessionIndex: undefined,
    });
    expect(buildChartSessionAxis("2026-06-20", 2)).toEqual({
      xLabel: "6/20 · #2",
      sortKey: parseLocalDateKeyMs("2026-06-20") + 0.0001,
      sessionIndex: 2,
    });
  });

  it("sorts chart rows by sortKey", () => {
    const rows = sortByChartSortKey([
      { sortKey: 2, value: "b" },
      { sortKey: 1, value: "a" },
    ]);
    expect(rows.map((row) => row.value)).toEqual(["a", "b"]);
  });
});
