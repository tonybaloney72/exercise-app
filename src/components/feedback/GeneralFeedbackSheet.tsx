"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import { getUserFeedbackRepo } from "@/lib/repos";
import {
  buildFeedbackContext,
  GENERAL_FEEDBACK_CATEGORY_LABELS,
  feedbackRateLimitBlocked,
  recordFeedbackSubmit,
  validateGeneralFeedbackSubmit,
  type GeneralFeedbackCategory,
} from "@/lib/userFeedback";
import { useAuthStore } from "@/stores/useAuthStore";

type GeneralFeedbackSheetProps = {
  open: boolean;
  onClose: () => void;
};

const CATEGORY_ORDER: GeneralFeedbackCategory[] = [
  "bug",
  "suggestion",
  "other",
];

export default function GeneralFeedbackSheet({
  open,
  onClose,
}: GeneralFeedbackSheetProps) {
  const authMode = useAuthStore((s) => s.mode);
  const [category, setCategory] = useState<GeneralFeedbackCategory | "">("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory("");
    setMessage("");
    setSubmitting(false);
  }, [open]);

  async function handleSubmit() {
    const validationError = validateGeneralFeedbackSubmit({
      category,
      message,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (feedbackRateLimitBlocked()) {
      toast.error("Too many messages recently. Please try again later.");
      return;
    }

    setSubmitting(true);
    try {
      await getUserFeedbackRepo().submitGeneralFeedback({
        category: category as GeneralFeedbackCategory,
        details: message.trim(),
        context: buildFeedbackContext({ authMode }),
      });
      recordFeedbackSubmit();
      toast.success("Thanks - your feedback was sent.");
      onClose();
    } catch (err) {
      console.error("[GeneralFeedbackSheet.submit]", err);
      toast.error("Could not send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title="Send feedback"
      hint="Report bugs, share ideas, or tell us what's confusing."
      ariaLabel="Send app feedback"
      maxWidth="lg"
      bodyClassName="flex flex-col gap-4 px-4 py-4"
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
            {submitting ? "Sending…" : "Send feedback"}
          </button>
        </div>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted">
          Category
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                category === value
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-surface-hover text-muted hover:text-foreground"
              }`}
              aria-pressed={category === value}
            >
              {GENERAL_FEEDBACK_CATEGORY_LABELS[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="general-feedback-message"
          className="text-xs font-medium uppercase tracking-wide text-muted"
        >
          Message
        </label>
        <textarea
          id="general-feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="What happened, what you expected, or what you'd like to see…"
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>
    </BottomSheetModal>
  );
}
