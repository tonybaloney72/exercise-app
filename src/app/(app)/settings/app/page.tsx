"use client";

import AnimatedSection from "@/components/common/AnimatedSection";
import AppSettingsPageContent from "@/components/settings/AppSettingsPageContent";
import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";
import { useDiagnosticLogUnlock } from "@/hooks/useDiagnosticLogUnlock";

export default function AppSettingsPage() {
  const { unlocked: diagnosticLogUnlocked } = useDiagnosticLogUnlock();

  return (
    <SettingsSubpageLayout
      title="App & updates"
      hint="What's new, Android app, and troubleshooting"
    >
      <AnimatedSection>
        <AppSettingsPageContent diagnosticLogUnlocked={diagnosticLogUnlocked} />
      </AnimatedSection>
    </SettingsSubpageLayout>
  );
}
