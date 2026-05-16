"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTrainingWeekRefreshStore } from "@/stores/useTrainingWeekRefreshStore";

export default function TrainingWeekRefreshBanner() {
  const mode = useAuthStore((s) => s.mode);
  const notice = useTrainingWeekRefreshStore((s) => s.notice);
  const dismissNotice = useTrainingWeekRefreshStore((s) => s.dismissNotice);

  if (mode !== "authenticated" || !notice) return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-accent/35 bg-accent/10 px-4 py-3 text-sm text-foreground"
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 leading-snug">{notice.message}</p>
        <button
          type="button"
          onClick={dismissNotice}
          className="shrink-0 rounded-md p-1 text-muted hover:bg-accent/15 hover:text-foreground"
          aria-label="Dismiss"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <Link
        href="/weekly"
        className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
      >
        View weekly overview
      </Link>
    </div>
  );
}
