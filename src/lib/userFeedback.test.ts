import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildExerciseFeedbackSnapshots,
  feedbackRateLimitBlocked,
  recordFeedbackSubmit,
  validateExerciseFeedbackSubmit,
} from "@/lib/userFeedback";

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("userFeedback", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds snapshots from exercise fields", () => {
    const snapshots = buildExerciseFeedbackSnapshots({
      name: "Push-up",
      notes: "Keep core tight.",
      videoUrl: "https://www.youtube.com/watch?v=abc",
    });
    expect(snapshots.snapshotName).toBe("Push-up");
    expect(snapshots.snapshotDescription).toBe("Keep core tight.");
    expect(snapshots.snapshotLink).toBe("https://www.youtube.com/watch?v=abc");
    expect(snapshots.snapshotLinkLabel).toBe("Watch video");
  });

  it("truncates long descriptions", () => {
    const long = "a".repeat(600);
    const snapshots = buildExerciseFeedbackSnapshots({
      name: "Test",
      notes: long,
      videoUrl: undefined,
    });
    expect(snapshots.snapshotDescription?.length).toBe(501);
    expect(snapshots.snapshotDescription?.endsWith("…")).toBe(true);
  });

  it("validates category and other details", () => {
    expect(validateExerciseFeedbackSubmit({ category: "", details: "" })).toMatch(
      /issue type/i,
    );
    expect(
      validateExerciseFeedbackSubmit({ category: "other", details: "   " }),
    ).toMatch(/describe/i);
    expect(
      validateExerciseFeedbackSubmit({
        category: "bad_link",
        details: "",
      }),
    ).toBeNull();
  });

  it("rate limits after max submits in window", () => {
    expect(feedbackRateLimitBlocked()).toBe(false);
    for (let i = 0; i < 10; i++) recordFeedbackSubmit();
    expect(feedbackRateLimitBlocked()).toBe(true);
  });
});
