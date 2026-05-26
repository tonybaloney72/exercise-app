import { describe, expect, it } from "vitest";
import { exerciseVideoLinkLabel, isYoutubeVideoUrl } from "@/lib/exerciseVideoLink";

describe("exerciseVideoLink", () => {
  it("detects YouTube hosts", () => {
    expect(isYoutubeVideoUrl("https://www.youtube.com/watch?v=abc")).toBe(true);
    expect(isYoutubeVideoUrl("https://youtu.be/abc")).toBe(true);
    expect(isYoutubeVideoUrl("https://www.rehabhero.ca/exercise/foo")).toBe(false);
    expect(isYoutubeVideoUrl("https://darebee.com/exercises/foo")).toBe(false);
  });

  it("labels non-YouTube links as Resource", () => {
    expect(
      exerciseVideoLinkLabel("https://www.drfitology.com/exercises/lats/stretch"),
    ).toBe("Resource");
    expect(
      exerciseVideoLinkLabel("https://www.youtube.com/watch?v=abc"),
    ).toBe("Watch video");
  });
});
