"use client";

import AnimatedSection from "@/components/common/AnimatedSection";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import AccountSettingsSection from "@/components/settings/AccountSettingsSection";
import AboutDeveloperSection from "@/components/settings/AboutDeveloperSection";
import SettingsFeedbackSection from "@/components/settings/SettingsFeedbackSection";
import SettingsLinkRow from "@/components/settings/SettingsLinkRow";
import { useDiagnosticLogUnlock } from "@/hooks/useDiagnosticLogUnlock";

export default function SettingsPage() {
  const {
    onUnlockHeaderTap,
    onUnlockHeaderPressStart,
    onUnlockHeaderPressEnd,
  } = useDiagnosticLogUnlock();

  return (
    <div className="flex flex-col py-6 gap-5">
      <div
        className="select-none"
        onClick={onUnlockHeaderTap}
        onPointerDown={onUnlockHeaderPressStart}
        onPointerUp={onUnlockHeaderPressEnd}
        onPointerLeave={onUnlockHeaderPressEnd}
        onPointerCancel={onUnlockHeaderPressEnd}
      >
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-1">Customize your experience</p>
      </div>

      <AnimatedSection>
        <AccountSettingsSection />
      </AnimatedSection>

      <AnimatedSection delay={0.03}>
        <div className="flex flex-col gap-2">
          <SettingsLinkRow
            href="/settings/training"
            title="Training plan"
            hint="Week layout, difficulty, and equipment"
          />
          <SettingsLinkRow
            href="/settings/device"
            title="Device & timers"
            hint="Theme, rest timers, and Health Connect"
          />
          <SettingsLinkRow
            href="/settings/app"
            title="App & updates"
            hint="What's new, Android app, and troubleshooting"
          />
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.05}>
        <CollapsibleSection
          title="Feedback"
          hint="Bugs, ideas, and confusing UX"
          defaultOpen={false}
          contentClassName="flex flex-col gap-3 p-4"
        >
          <p className="text-xs text-muted">
            Send a message to the developer and help us improve MyExercise.
          </p>
          <SettingsFeedbackSection />
        </CollapsibleSection>
      </AnimatedSection>

      <AnimatedSection delay={0.055}>
        <AboutDeveloperSection />
      </AnimatedSection>
    </div>
  );
}
