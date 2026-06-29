import { describe, expect, it } from "vitest";
import releaseNotesJson from "@/data/releaseNotes.json";
import {
  getAllReleaseNotes,
  getLatestReleaseNote,
  getLatestUnseenReleaseNote,
  getRecentReleaseNotes,
  MAX_BUNDLED_RELEASE_NOTES,
  releaseNoteHeading,
} from "@/lib/releaseNotes";

describe("bundled release notes", () => {
  it("ships at most three entries", () => {
    expect(releaseNotesJson.length).toBeLessThanOrEqual(MAX_BUNDLED_RELEASE_NOTES);
  });
});

describe("getLatestReleaseNote", () => {
  it("returns the newest bundled note", () => {
    expect(getLatestReleaseNote()?.id).toBe("2026-06-30-stretch-generation");
  });
});

describe("getRecentReleaseNotes", () => {
  it("returns up to three newest notes for settings", () => {
    expect(getRecentReleaseNotes(3).map((n) => n.id)).toEqual([
      "2026-06-30-stretch-generation",
      "2026-06-29-cardio-endurance",
      "2026-06-28-cardio-speed-hc",
    ]);
  });
});

describe("getLatestUnseenReleaseNote", () => {
  it("returns only the newest note when it was not dismissed", () => {
    const note = getLatestUnseenReleaseNote(
      new Set(["2026-06-29-cardio-endurance", "2026-06-28-cardio-speed-hc"]),
    );
    expect(note?.id).toBe("2026-06-30-stretch-generation");
  });

  it("returns nothing when the newest note was dismissed", () => {
    expect(
      getLatestUnseenReleaseNote(
        new Set([
          "2026-06-30-stretch-generation",
          "2026-06-29-cardio-endurance",
          "2026-06-28-cardio-speed-hc",
        ]),
      ),
    ).toBeUndefined();
  });
});

describe("getAllReleaseNotes", () => {
  it("returns every bundled note newest first", () => {
    expect(getAllReleaseNotes().map((n) => n.id)).toEqual([
      "2026-06-30-stretch-generation",
      "2026-06-29-cardio-endurance",
      "2026-06-28-cardio-speed-hc",
    ]);
  });
});

describe("bundled note cap", () => {
  it("keeps only the three newest entries even if JSON has more", () => {
    expect(getAllReleaseNotes().length).toBe(MAX_BUNDLED_RELEASE_NOTES);
  });
});

describe("releaseNoteHeading", () => {
  it("prefers title when present", () => {
    expect(
      releaseNoteHeading({
        id: "2026-06-28-cardio-speed-hc",
        date: "2026-06-28",
        title: "Cardio speed & Health Connect",
        highlights: [],
      }),
    ).toBe("Cardio speed & Health Connect");
  });
});
