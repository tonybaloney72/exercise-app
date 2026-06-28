import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLocalReleaseNotesSeenIds,
  markReleaseNotesSeen,
  RELEASE_NOTES_SEEN_STORAGE_KEY,
} from "@/lib/releaseNotesSeen";
import { createMemoryStorageMock } from "@/test/memoryStorageMock";

const updateMock = vi.fn().mockResolvedValue({ error: null });
const getUserMock = vi.fn().mockResolvedValue({ data: { user: null } });

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      update: () => ({
        eq: updateMock,
      }),
    }),
  }),
}));

describe("getLocalReleaseNotesSeenIds", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("migrates legacy semver dismissals to note ids", () => {
    localStorage.setItem("release-notes-last-seen-version", "0.20.0");
    const seen = getLocalReleaseNotesSeenIds();
    expect(seen.has("2026-06-20-health-connect")).toBe(true);
    expect(localStorage.getItem("release-notes-last-seen-version")).toBeNull();
    expect(localStorage.getItem(RELEASE_NOTES_SEEN_STORAGE_KEY)).toContain(
      "2026-06-20-health-connect",
    );
  });
});

describe("markReleaseNotesSeen", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorageMock());
    updateMock.mockClear();
    getUserMock.mockResolvedValue({ data: { user: null } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores dismissed ids in localStorage for guests", async () => {
    const seen = await markReleaseNotesSeen(["2026-06-28-cardio-speed-hc"]);
    expect(seen).toEqual(["2026-06-28-cardio-speed-hc"]);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("syncs dismissed ids to Supabase for signed-in users", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const seen = await markReleaseNotesSeen(["2026-06-28-cardio-speed-hc"]);
    expect(seen).toEqual(["2026-06-28-cardio-speed-hc"]);
    expect(updateMock).toHaveBeenCalledWith("user_id", "user-1");
  });
});
