import { describe, expect, it } from "vitest";
import { chartImageFilename } from "@/utils/exportChartImage";

describe("chartImageFilename", () => {
  it("slugifies labels and adds png extension", () => {
    expect(chartImageFilename("Workouts per week")).toBe(
      "workouts-per-week.png",
    );
    expect(chartImageFilename("  Push-Up  ")).toBe("push-up.png");
  });

  it("falls back for empty labels", () => {
    expect(chartImageFilename("!!!")).toBe("chart.png");
  });
});
