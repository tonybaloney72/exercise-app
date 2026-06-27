"use client";

import CollapsibleSection from "@/components/common/CollapsibleSection";
import {
  formatReleaseNoteDate,
  getAllReleaseNotes,
  releaseNoteHeading,
  type ReleaseNote,
} from "@/lib/releaseNotes";

export function WhatsNewNotesList({ notes }: { notes: ReleaseNote[] }) {
  if (notes.length === 0) {
    return <p className="text-sm text-muted">No release notes yet.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {notes.map((note) => (
        <section
          key={note.id}
          aria-labelledby={`settings-whats-new-${note.id}`}
        >
          <div className="mb-2">
            <h3
              id={`settings-whats-new-${note.id}`}
              className="text-sm font-semibold text-foreground"
            >
              {releaseNoteHeading(note)}
            </h3>
            {note.title ? (
              <p className="text-xs text-muted">
                {formatReleaseNoteDate(note.date)}
              </p>
            ) : null}
          </div>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
            {note.highlights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function useReleaseNotesForApp() {
  return getAllReleaseNotes();
}

export default function WhatsNewSection() {
  const notes = useReleaseNotesForApp();

  if (notes.length === 0) return null;

  return (
    <CollapsibleSection
      title="What's new"
      hint="Recent updates and improvements"
      defaultOpen={false}
      contentClassName="flex flex-col gap-5 p-4"
    >
      <WhatsNewNotesList notes={notes} />
    </CollapsibleSection>
  );
}
