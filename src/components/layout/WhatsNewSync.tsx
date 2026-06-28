"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WhatsNewModal from "@/components/layout/WhatsNewModal";
import {
  getLatestUnseenReleaseNote,
  type ReleaseNote,
} from "@/lib/releaseNotes";
import { markReleaseNotesSeen } from "@/lib/releaseNotesSeen";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

function canShowWhatsNewModal(mode: ReturnType<typeof useAuthStore.getState>["mode"]) {
  return mode === "authenticated";
}

/** Shows the What's new modal for the latest unseen release note after settings hydrate. */
export default function WhatsNewSync() {
  const mode = useAuthStore((s) => s.mode);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const seenIdsKey = useSettingsStore((s) => s.releaseNotesSeenIds.join("\0"));
  const latestUnseenId = useMemo(() => {
    if (!canShowWhatsNewModal(mode) || !settingsHydrated) return null;
    return (
      getLatestUnseenReleaseNote(
        new Set(useSettingsStore.getState().releaseNotesSeenIds),
      )?.id ?? null
    );
  }, [mode, settingsHydrated, seenIdsKey]);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const shownIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!latestUnseenId) {
      shownIdRef.current = null;
      setOpen(false);
      setNotes([]);
      return;
    }

    if (shownIdRef.current === latestUnseenId) {
      return;
    }

    const latest = getLatestUnseenReleaseNote(
      new Set(useSettingsStore.getState().releaseNotesSeenIds),
    );
    if (!latest) {
      shownIdRef.current = null;
      setOpen(false);
      setNotes([]);
      return;
    }

    shownIdRef.current = latest.id;
    setNotes([latest]);
    setOpen(true);
  }, [latestUnseenId]);

  async function handleDismiss() {
    const seen = await markReleaseNotesSeen(notes.map((note) => note.id));
    shownIdRef.current = null;
    useSettingsStore.setState({ releaseNotesSeenIds: seen });
    setOpen(false);
    setNotes([]);
  }

  return (
    <WhatsNewModal open={open} notes={notes} onDismiss={() => void handleDismiss()} />
  );
}
