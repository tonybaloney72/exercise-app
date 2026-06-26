import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatReleaseNoteDate,
  getReleaseNotesForAppVersion,
  getUnseenReleaseNotes,
  markReleaseNotesSeen,
} from "@/lib/releaseNotes";

describe("getUnseenReleaseNotes", () => {
  it("returns notes newer than last seen and at or below app version", () => {
    const unseen = getUnseenReleaseNotes("0.20.0", "0.18.0");
    expect(unseen.map((n) => n.version)).toEqual(["0.20.0"]);
  });

  it("returns nothing when last seen matches app version", () => {
    expect(getUnseenReleaseNotes("0.20.0", "0.20.0")).toEqual([]);
  });

  it("skips notes above the running app version", () => {
    expect(getUnseenReleaseNotes("0.19.0", null)).toEqual([]);
  });
});

describe("getReleaseNotesForAppVersion", () => {
  it("includes only notes at or below app version", () => {
    expect(getReleaseNotesForAppVersion("0.20.0").map((n) => n.version)).toEqual([
      "0.20.0",
    ]);
    expect(getReleaseNotesForAppVersion("0.19.0")).toEqual([]);
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

  it("stores the dismissed app version", () => {
    markReleaseNotesSeen("0.20.0");
    expect(getUnseenReleaseNotes("0.20.0")).toEqual([]);
  });

  it("keeps the higher stored version when called with an older one", () => {
    markReleaseNotesSeen("0.20.0");
    markReleaseNotesSeen("0.19.0");
    expect(storage.get("release-notes-last-seen-version")).toBe("0.20.0");
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
