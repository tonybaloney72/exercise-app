import { describe, expect, it } from "vitest";
import {
  buildYoutubeSearchQuery,
  titleMatchScore,
  rankVideoCandidate,
  findDuplicateNameVideo,
  shouldAutoApprove,
} from "./video-suggest.mjs";

describe("video-suggest", () => {
  it("search query is exercise name only (ignores catalog source)", () => {
    expect(
      buildYoutubeSearchQuery({
        id: "UPL-7",
        name: "Pull-Up",
        sourceLabel: "Hybrid Calisthenics",
      }),
    ).toBe("Pull-Up");
    expect(
      buildYoutubeSearchQuery({
        id: "CF-1",
        name: "Toe Reach",
        sourceLabel: "Caroline Girvan",
      }),
    ).toBe("Toe Reach");
  });

  it("prefers demo-style titles when ranking", () => {
    const demo = rankVideoCandidate(
      "Hanging Leg Raise",
      "Hanging Leg Raise Tutorial - True Form",
      "Coach",
    );
    const vague = rankVideoCandidate(
      "Hanging Leg Raise",
      "raise the leg 🍗",
      "Hybrid Calisthenics",
    );
    expect(demo).toBeGreaterThan(vague);
  });

  it("scores title overlap", () => {
    expect(titleMatchScore("Pull-Up", "How to do a Pull Up")).toBeGreaterThan(0.4);
    expect(titleMatchScore("Pull-Up", "Best leg day workout")).toBeLessThan(0.3);
  });

  it("auto-approves strong tutorial matches", () => {
    expect(
      shouldAutoApprove({
        name: "Hanging Knee Raise",
        suggestedVideoUrl: "https://www.youtube.com/watch?v=MRcpnl4G3YA",
        verified: "yes",
        confidence: "high",
        titleMatchScore: "1.00",
        videoTitle: "Hanging Knee Raise Tutorial - True Form",
        strategy: "youtube_search",
        reviewStatus: "pending",
      }),
    ).toBe(true);
  });

  it("finds duplicate name with youtube url", () => {
    const all = [
      { id: "A", name: "Pull-Up", videoUrl: "https://www.youtube.com/watch?v=abc12345678" },
      { id: "B", name: "Pull-Up", videoUrl: null },
    ];
    expect(findDuplicateNameVideo(all, { id: "B", name: "Pull-Up" })?.id).toBe("A");
  });
});
