"use client";

import { useEffect, useState } from "react";
import WhatsNewModal from "@/components/layout/WhatsNewModal";
import {
  getUnseenReleaseNotes,
  markReleaseNotesSeen,
  resolveAppReleaseVersion,
  type ReleaseNote,
} from "@/lib/releaseNotes";

/** Shows the What's new modal once per app version after launch. */
export default function WhatsNewSync() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const version = await resolveAppReleaseVersion();
      if (cancelled) return;
      setAppVersion(version);
      const unseen = getUnseenReleaseNotes(version);
      if (unseen.length === 0) return;
      setNotes(unseen);
      setOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleDismiss() {
    if (appVersion) markReleaseNotesSeen(appVersion);
    setOpen(false);
  }

  return (
    <WhatsNewModal open={open} notes={notes} onDismiss={handleDismiss} />
  );
}
