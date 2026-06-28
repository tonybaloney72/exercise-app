"use client";

import {
  formatReleaseNoteDate,
  getRecentReleaseNotes,
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
  return getRecentReleaseNotes(3);
}
