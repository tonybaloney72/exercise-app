"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import { getUserFeedbackRepo } from "@/lib/repos";
import {
  buildExerciseFeedbackSnapshots,
  buildFeedbackContext,
  EXERCISE_FEEDBACK_CATEGORY_LABELS,
  feedbackRateLimitBlocked,
  recordFeedbackSubmit,
  validateExerciseFeedbackSubmit,
  type ExerciseFeedbackCategory,
  type UserFeedbackSource,
} from "@/lib/userFeedback";
import type { Exercise } from "@/types";

type ExerciseReportSheetProps = {
  open: boolean;
  onClose: () => void;
  exercise: Pick<Exercise, "id" | "name" | "notes" | "videoUrl">;
  source: Extract<UserFeedbackSource, "exercise_row" | "library">;
  contextExtra?: Record<string, unknown>;
};

const CATEGORY_ORDER: ExerciseFeedbackCategory[] = [
  "wrong_description",
  "bad_link",
  "other",
];

export default function ExerciseReportSheet({
  open,
  onClose,
  exercise,
  source,
  contextExtra,
}: ExerciseReportSheetProps) {
  const snapshots = useMemo(
    () => buildExerciseFeedbackSnapshots(exercise),
    [exercise],
  );
  const [category, setCategory] = useState<ExerciseFeedbackCategory | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory("");
    setDetails("");
    setSubmitting(false);
  }, [open, exercise.id]);

  async function handleSubmit() {
    const validationError = validateExerciseFeedbackSubmit({
      category,
      details,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (feedbackRateLimitBlocked()) {
      toast.error("Too many reports recently. Please try again later.");
      return;
    }

    setSubmitting(true);
    try {
      await getUserFeedbackRepo().submitExerciseReport({
        source,
        category: category as ExerciseFeedbackCategory,
        details: details.trim() || null,
        exerciseId: exercise.id,
        snapshotName: snapshots.snapshotName,
        snapshotDescription: snapshots.snapshotDescription,
        snapshotLink: snapshots.snapshotLink,
        context: buildFeedbackContext(contextExtra),
      });
      recordFeedbackSubmit();
      toast.success("Thanks - we'll review this.");
      onClose();
    } catch (err) {
      console.error("[ExerciseReportSheet.submit]", err);
      toast.error("Could not send report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title="Report an issue"
      hint="Flag wrong descriptions or broken resource links."
      ariaLabel="Report exercise issue"
      maxWidth="lg"
      bodyClassName="space-y-4 px-4 py-4"
      footer={
        <div className="flex gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="flex-1 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send report"}
          </button>
        </div>
      }
    >
      <div className="space-y-1 rounded-lg border border-border bg-surface-hover/50 px-3 py-2.5">
        <p className="text-sm font-medium text-foreground">
          {snapshots.snapshotName}
        </p>
        {snapshots.snapshotDescription ? (
          <p className="text-xs text-muted line-clamp-4">
            {snapshots.snapshotDescription}
          </p>
        ) : (
          <p className="text-xs italic text-muted">No description on file.</p>
        )}
        {snapshots.snapshotLink ? (
          <a
            href={snapshots.snapshotLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-accent hover:underline"
          >
            {snapshots.snapshotLinkLabel ?? "Resource"}
          </a>
        ) : (
          <p className="text-xs italic text-muted">No resource link on file.</p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted">
          Issue type
        </legend>
        {CATEGORY_ORDER.map((value) => (
          <label
            key={value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
              category === value
                ? "border-accent bg-accent/10"
                : "border-border hover:bg-surface-hover"
            }`}
          >
            <input
              type="radio"
              name="feedback-category"
              value={value}
              checked={category === value}
              onChange={() => setCategory(value)}
              className="accent-accent"
            />
            <span className="text-sm text-foreground">
              {EXERCISE_FEEDBACK_CATEGORY_LABELS[value]}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-1.5">
        <label
          htmlFor="feedback-details"
          className="text-xs font-medium uppercase tracking-wide text-muted"
        >
          {category === "other"
            ? "Details (required)"
            : "Additional details (optional)"}
        </label>
        <textarea
          id="feedback-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder={
            category === "other"
              ? "What’s wrong with this exercise?"
              : "Anything else we should know?"
          }
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>
    </BottomSheetModal>
  );
}
