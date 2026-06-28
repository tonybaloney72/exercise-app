"use client";

import { useEffect, useMemo, useState } from "react";
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
  const userId = useAuthStore((s) => s.user?.id);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const releaseNotesSeenIds = useSettingsStore((s) => s.releaseNotesSeenIds);
  const seenIdsKey = useMemo(
    () => releaseNotesSeenIds.join("\0"),
    [releaseNotesSeenIds],
  );
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<ReleaseNote[]>([]);

  useEffect(() => {
    if (!canShowWhatsNewModal(mode) || !settingsHydrated) {
      setOpen(false);
      setNotes([]);
      return;
    }

    const latest = getLatestUnseenReleaseNote(new Set(releaseNotesSeenIds));
    if (!latest) {
      setOpen(false);
      setNotes([]);
      return;
    }

    setNotes((prev) => (prev[0]?.id === latest.id ? prev : [latest]));
    setOpen(true);
  }, [mode, userId, settingsHydrated, seenIdsKey]);

  async function handleDismiss() {
    const seen = await markReleaseNotesSeen(notes.map((note) => note.id));
    useSettingsStore.setState({ releaseNotesSeenIds: seen });
    setOpen(false);
    setNotes([]);
  }

  return (
    <WhatsNewModal open={open} notes={notes} onDismiss={() => void handleDismiss()} />
  );
}
