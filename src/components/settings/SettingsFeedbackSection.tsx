"use client";

import { useState } from "react";
import GeneralFeedbackSheet from "@/components/feedback/GeneralFeedbackSheet";

export default function SettingsFeedbackSection() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10"
      >
        Send feedback
      </button>
      <GeneralFeedbackSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
