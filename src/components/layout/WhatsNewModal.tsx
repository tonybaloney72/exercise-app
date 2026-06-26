"use client";

import BottomSheetModal from "@/components/common/BottomSheetModal";
import {
  formatReleaseNoteDate,
  type ReleaseNote,
} from "@/lib/releaseNotes";

export type WhatsNewModalProps = {
  open: boolean;
  notes: ReleaseNote[];
  onDismiss: () => void;
};

export default function WhatsNewModal({
  open,
  notes,
  onDismiss,
}: WhatsNewModalProps) {
  if (notes.length === 0) return null;

  return (
    <BottomSheetModal
      open={open}
      onClose={onDismiss}
      title="What's new"
      hint="Recent updates in MyExercise"
      ariaLabel="What's new"
      footer={
        <button
          type="button"
          onClick={onDismiss}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent/90"
        >
          Got it
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        {notes.map((note) => (
          <section key={note.version} aria-labelledby={`whats-new-${note.version}`}>
            <div className="mb-2">
              <h3
                id={`whats-new-${note.version}`}
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
      </div>
    </BottomSheetModal>
  );
}
