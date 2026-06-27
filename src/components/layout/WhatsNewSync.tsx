"use client";

import { useEffect, useState } from "react";
import WhatsNewModal from "@/components/layout/WhatsNewModal";
import {
  getUnseenReleaseNotes,
  markReleaseNotesSeen,
  type ReleaseNote,
} from "@/lib/releaseNotes";
import { useAuthStore } from "@/stores/useAuthStore";

function canShowWhatsNewModal(mode: ReturnType<typeof useAuthStore.getState>["mode"]) {
  return mode === "authenticated";
}

/** Shows the What's new modal once per release note after entering the app shell. */
export default function WhatsNewSync() {
  const mode = useAuthStore((s) => s.mode);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<ReleaseNote[]>([]);

  useEffect(() => {
    if (!canShowWhatsNewModal(mode)) {
      setOpen(false);
      return;
    }

    const unseen = getUnseenReleaseNotes();
    if (unseen.length === 0) {
      setOpen(false);
      return;
    }
    setNotes(unseen);
    setOpen(true);
  }, [mode]);

  function handleDismiss() {
    markReleaseNotesSeen(notes.map((note) => note.id));
    setOpen(false);
  }

  return (
    <WhatsNewModal open={open} notes={notes} onDismiss={handleDismiss} />
  );
}
