import { describe, expect, it } from "vitest";
import { elapsedFromSetTimer } from "@/lib/setTimerElapsed";

describe("elapsedFromSetTimer", () => {
  it("returns full total when the dial is at 0", () => {
    expect(elapsedFromSetTimer(45, 0)).toBe(45);
  });

  it("subtracts remaining time from the started total", () => {
    expect(elapsedFromSetTimer(45, 12)).toBe(33);
  });

  it("never goes negative", () => {
    expect(elapsedFromSetTimer(30, 40)).toBe(0);
  });
});
