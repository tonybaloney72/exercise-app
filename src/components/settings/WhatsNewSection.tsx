"use client";

import { useEffect, useState } from "react";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import {
  formatReleaseNoteDate,
  getReleaseNotesForAppVersion,
  resolveAppReleaseVersion,
  type ReleaseNote,
} from "@/lib/releaseNotes";

export default function WhatsNewSection() {
  const [notes, setNotes] = useState<ReleaseNote[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const version = await resolveAppReleaseVersion();
      if (cancelled) return;
      setNotes(getReleaseNotesForAppVersion(version));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (notes.length === 0) return null;

  return (
    <CollapsibleSection
      title="What's new"
      hint="Recent updates and improvements"
      defaultOpen={false}
      contentClassName="flex flex-col gap-5 p-4"
    >
      {notes.map((note) => (
        <section key={note.version} aria-labelledby={`settings-whats-new-${note.version}`}>
          <div className="mb-2">
            <h3
              id={`settings-whats-new-${note.version}`}
              className="text-sm font-semibold text-foreground"
            >
              Version {note.version}
            </h3>
            <p className="text-xs text-muted">
              {formatReleaseNoteDate(note.date)}
            </p>
          </div>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
            {note.highlights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
    </CollapsibleSection>
  );
}
