"use client";

import { useSyncExternalStore } from "react";
import AnimatedSection from "@/components/common/AnimatedSection";
import { shouldShowAndroidAppDownload } from "@/lib/androidAppDownload";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import AndroidAppDownloadSection from "@/components/settings/AndroidAppDownloadSection";
import NativeAppUpdateSection from "@/components/settings/NativeAppUpdateSection";

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

/** APK update + download blocks; omits the section wrapper when neither applies. */
export default function AppPlatformSettingsSections() {
  const showDownload = useSyncExternalStore(
    subscribe,
    getDownloadSnapshot,
    getDownloadServerSnapshot,
  );
  const showNative = isNativePlatform();

  if (!showDownload && !showNative) return null;

  return (
    <AnimatedSection delay={0.05}>
      {showNative ? <NativeAppUpdateSection /> : null}
      {showDownload ? <AndroidAppDownloadSection /> : null}
    </AnimatedSection>
  );
}
