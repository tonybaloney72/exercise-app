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
  it("ships at most three entries in JSON", () => {
    expect(releaseNotesJson.length).toBeLessThanOrEqual(
      MAX_BUNDLED_RELEASE_NOTES,
    );
  });

  it("exposes at most three notes after runtime cap", () => {
    expect(getAllReleaseNotes().length).toBeLessThanOrEqual(
      MAX_BUNDLED_RELEASE_NOTES,
    );
  });

  it("orders notes newest first by date", () => {
    const notes = getAllReleaseNotes();
    for (let i = 1; i < notes.length; i += 1) {
      expect(notes[i - 1]!.date.localeCompare(notes[i]!.date)).toBeGreaterThanOrEqual(
        0,
      );
    }
  });
});

describe("getLatestUnseenReleaseNote", () => {
  it("returns the latest note when it was not dismissed", () => {
    const latest = getLatestReleaseNote();
    if (!latest) return;
    expect(getLatestUnseenReleaseNote(new Set())).toEqual(latest);
    expect(getLatestUnseenReleaseNote(new Set([latest.id]))).toBeUndefined();
  });
});

describe("getRecentReleaseNotes", () => {
  it("returns a prefix of bundled notes", () => {
    const all = getAllReleaseNotes();
    expect(getRecentReleaseNotes(2)).toEqual(all.slice(0, 2));
  });
});

describe("releaseNoteHeading", () => {
  it("prefers title when present", () => {
    expect(
      releaseNoteHeading({
        id: "example",
        date: "2026-06-28",
        title: "Cardio speed & Health Connect",
        highlights: [],
      }),
    ).toBe("Cardio speed & Health Connect");
  });
});
