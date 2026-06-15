"use client";

import { useSyncExternalStore } from "react";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import {
  resolveAndroidAppDownloadUrl,
  shouldShowAndroidAppDownload,
} from "@/lib/androidAppDownload";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return shouldShowAndroidAppDownload();
}

function getServerSnapshot() {
  return false;
}

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export default function AndroidAppDownloadSection() {
  const show = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!show) return null;

  const downloadUrl = resolveAndroidAppDownloadUrl();

  return (
    <CollapsibleSection
      title="Android app"
      hint="Native install (APK)"
      defaultOpen={false}
      contentClassName="space-y-3 p-4"
    >
      <p className="text-xs leading-snug text-muted">
        You&apos;re using the installed web app. Download the native Android app
        for the launcher icon, splash screen, and pull-to-refresh without a
        browser tab.
      </p>
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
      >
        <DownloadIcon />
        Download Android app
      </a>
      <p className="text-caption leading-snug text-muted">
        Opens the APK download. You may need to allow installs from your browser
        once, then open the file to install.
      </p>
    </CollapsibleSection>
  );
}
