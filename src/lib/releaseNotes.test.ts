import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatReleaseNoteDate,
  getAllReleaseNotes,
  getUnseenReleaseNotes,
  markReleaseNotesSeen,
  releaseNoteHeading,
} from "@/lib/releaseNotes";

describe("getUnseenReleaseNotes", () => {
  it("returns bundled notes not in the seen set", () => {
    const unseen = getUnseenReleaseNotes(new Set(["2026-06-20-health-connect"]));
    expect(unseen.map((n) => n.id)).toEqual(["2026-06-27"]);
  });

  it("returns nothing when every bundled note was seen", () => {
    expect(
      getUnseenReleaseNotes(
        new Set(["2026-06-27", "2026-06-20-health-connect"]),
      ),
    ).toEqual([]);
  });

  it("returns all notes when nothing was seen", () => {
    expect(getUnseenReleaseNotes(new Set()).map((n) => n.id)).toEqual([
      "2026-06-27",
      "2026-06-20-health-connect",
    ]);
  });
});

describe("getAllReleaseNotes", () => {
  it("returns every bundled note newest first", () => {
    expect(getAllReleaseNotes().map((n) => n.id)).toEqual([
      "2026-06-27",
      "2026-06-20-health-connect",
    ]);
  });
});

describe("markReleaseNotesSeen", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores dismissed note ids", () => {
    markReleaseNotesSeen(["2026-06-27"]);
    expect(getUnseenReleaseNotes().map((n) => n.id)).toEqual([
      "2026-06-20-health-connect",
    ]);
  });

  it("accumulates seen ids across dismissals", () => {
    markReleaseNotesSeen(["2026-06-27"]);
    markReleaseNotesSeen(["2026-06-20-health-connect"]);
    expect(getUnseenReleaseNotes()).toEqual([]);
  });

  it("migrates legacy semver dismissals to note ids", () => {
    storage.set("release-notes-last-seen-version", "0.20.0");
    expect(getUnseenReleaseNotes().map((n) => n.id)).toEqual(["2026-06-27"]);
    expect(storage.has("release-notes-last-seen-version")).toBe(false);
  });
});

describe("releaseNoteHeading", () => {
  it("prefers title when present", () => {
    expect(
      releaseNoteHeading({
        id: "2026-06-27",
        date: "2026-06-27",
        title: "Settings & workout polish",
        highlights: [],
      }),
    ).toBe("Settings & workout polish");
  });
});

describe("formatReleaseNoteDate", () => {
  it("formats ISO date keys", () => {
    expect(formatReleaseNoteDate("2026-06-20")).toMatch(/Jun/);
    expect(formatReleaseNoteDate("2026-06-20")).toMatch(/20/);
    expect(formatReleaseNoteDate("2026-06-20")).toMatch(/2026/);
  });

  it("returns the raw key when parsing fails", () => {
    expect(formatReleaseNoteDate("not-a-date")).toBe("not-a-date");
  });
});
