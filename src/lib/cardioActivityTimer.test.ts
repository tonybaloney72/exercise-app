import { describe, expect, it } from "vitest";
import {
  cardioActivityActiveSeconds,
  pauseCardioActivityTimer,
  resumeCardioActivityTimer,
  startCardioActivityTimer,
} from "@/lib/cardioActivityTimer";

describe("cardioActivityTimer", () => {
  it("excludes paused time from active seconds", () => {
    let state = startCardioActivityTimer(0);
    state = pauseCardioActivityTimer(state, 60_000);
    state = resumeCardioActivityTimer(state, 120_000);
    expect(cardioActivityActiveSeconds(state, 180_000)).toBe(120);
  });

  it("freezes elapsed while paused", () => {
    let state = startCardioActivityTimer(0);
    state = pauseCardioActivityTimer(state, 45_000);
    expect(cardioActivityActiveSeconds(state, 300_000)).toBe(45);
  });
});
