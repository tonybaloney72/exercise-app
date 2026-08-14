import { describe, expect, it } from "vitest";
import {
  adjustCountdownPlan,
  elapsedFromSetTimer,
} from "@/lib/setTimerElapsed";

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

describe("adjustCountdownPlan", () => {
  it("extends planned total when adding time near the end", () => {
    // 30s set, 2s left (28s worked), +15 → 17s left, 45s planned
    const next = adjustCountdownPlan(30, 2, 15);
    expect(next).toEqual({ restTotalSeconds: 45, secondsLeft: 17 });
    expect(elapsedFromSetTimer(next.restTotalSeconds, 8)).toBe(37);
  });

  it("grows the plan when adding time at the start", () => {
    expect(adjustCountdownPlan(30, 30, 15)).toEqual({
      restTotalSeconds: 45,
      secondsLeft: 45,
    });
  });

  it("keeps elapsed when subtracting more than remaining", () => {
    // 30s set, 10s left (20s worked), −15 → 0 left, 20s planned
    const next = adjustCountdownPlan(30, 10, -15);
    expect(next).toEqual({ restTotalSeconds: 20, secondsLeft: 0 });
    expect(
      elapsedFromSetTimer(next.restTotalSeconds, next.secondsLeft),
    ).toBe(20);
  });
});
