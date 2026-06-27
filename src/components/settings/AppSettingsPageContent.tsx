"use client";

import { useSyncExternalStore } from "react";
import AndroidAppDownloadSection from "@/components/settings/AndroidAppDownloadSection";
import DiagnosticLogSection from "@/components/settings/DiagnosticLogSection";
import NativeAppUpdateSection from "@/components/settings/NativeAppUpdateSection";
import SettingsSectionBlock from "@/components/settings/SettingsSectionBlock";
import {
  useReleaseNotesForApp,
  WhatsNewNotesList,
} from "@/components/settings/WhatsNewSection";
import { shouldShowAndroidAppDownload } from "@/lib/androidAppDownload";
import { isNativePlatform } from "@/lib/capacitorRuntime";

function subscribe() {
  return () => {};
}

function getDownloadSnapshot() {
  return shouldShowAndroidAppDownload();
}

function getDownloadServerSnapshot() {
  return shouldShowAndroidAppDownload(undefined, {
    isDevelopment: process.env.NODE_ENV === "development",
  });
}

export default function AppSettingsPageContent({
  diagnosticLogUnlocked,
}: {
  diagnosticLogUnlocked: boolean;
}) {
  const showDownload = useSyncExternalStore(
    subscribe,
    getDownloadSnapshot,
    getDownloadServerSnapshot,
  );
  const showNative = isNativePlatform();
  const showPlatform = showDownload || showNative;
  const releaseNotes = useReleaseNotesForApp();

  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionBlock
        title="What's new"
        hint="Recent updates and improvements"
      >
        <WhatsNewNotesList notes={releaseNotes} />
      </SettingsSectionBlock>

      {showPlatform ? (
        <SettingsSectionBlock
          title="App updates"
          hint="Install or update the Android app"
        >
          {showNative ? <NativeAppUpdateSection /> : null}
          {showDownload ? <AndroidAppDownloadSection /> : null}
        </SettingsSectionBlock>
      ) : null}

      {diagnosticLogUnlocked ? (
        <SettingsSectionBlock
          title="Diagnostic log"
          hint="Debug GPS, Health Connect, and save issues"
        >
          <DiagnosticLogSection />
        </SettingsSectionBlock>
      ) : null}
    </div>
  );
}
