import { describe, expect, it } from "vitest";
import {
  countdownRingProgress,
  countdownRemainingMs,
  displayCountdownSeconds,
  parseTimeInput,
} from "@/utils/time";

describe("parseTimeInput", () => {
  it("parses MM:SS with colon", () => {
    expect(parseTimeInput("9:30")).toBe(570);
    expect(parseTimeInput("17:35")).toBe(1055);
  });

  it("parses numeric entry without colon", () => {
    expect(parseTimeInput("930")).toBe(570);
    expect(parseTimeInput("1735")).toBe(1055);
    expect(parseTimeInput("32")).toBe(1920);
    expect(parseTimeInput("9.5")).toBe(570);
  });

  it("returns undefined for empty or invalid input", () => {
    expect(parseTimeInput("")).toBeUndefined();
    expect(parseTimeInput("   ")).toBeUndefined();
    expect(parseTimeInput("abc")).toBeUndefined();
    expect(parseTimeInput("9999")).toBeUndefined();
    expect(parseTimeInput("12345")).toBeUndefined();
  });
});

describe("countdown display helpers", () => {
  it("displayCountdownSeconds uses ceiling buckets", () => {
    expect(displayCountdownSeconds(90_000)).toBe(90);
    expect(displayCountdownSeconds(1_001)).toBe(2);
    expect(displayCountdownSeconds(1_000)).toBe(1);
    expect(displayCountdownSeconds(1)).toBe(1);
    expect(displayCountdownSeconds(0)).toBe(0);
  });

  it("countdownRingProgress tracks continuous remaining fraction", () => {
    expect(countdownRingProgress(30_000, 60)).toBeCloseTo(0.5);
    expect(countdownRingProgress(0, 60)).toBe(0);
    expect(countdownRingProgress(60_000, 60)).toBe(1);
  });

  it("countdownRemainingMs is zero at or after deadline", () => {
    const ends = 1_000_000;
    expect(countdownRemainingMs(ends, ends)).toBe(0);
    expect(countdownRemainingMs(ends, ends + 500)).toBe(0);
    expect(countdownRemainingMs(ends, ends - 250)).toBe(250);
  });
});
