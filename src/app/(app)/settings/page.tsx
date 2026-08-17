"use client";

import AnimatedSection from "@/components/common/AnimatedSection";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import AccountSettingsSection from "@/components/settings/AccountSettingsSection";
import AboutDeveloperSection from "@/components/settings/AboutDeveloperSection";
import SettingsFeedbackSection from "@/components/settings/SettingsFeedbackSection";
import SettingsLinkRow from "@/components/settings/SettingsLinkRow";
import { useDiagnosticLogUnlock } from "@/hooks/useDiagnosticLogUnlock";
import { routes } from "@/lib/appRoutes";

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
            href={routes.settingsLibrary}
            title="Exercise library"
            hint="Browse and manage exercises"
          />
          <SettingsLinkRow
            href={routes.settingsTraining}
            title="Training plan"
            hint="Week layout, difficulty, equipment, and progression"
          />
          <SettingsLinkRow
            href={routes.settingsBody}
            title="Body & weight"
            hint="Height, age, sex, and daily weight for calorie estimates"
          />
          <SettingsLinkRow
            href={routes.settingsDevice}
            title="Device & timers"
            hint="Theme, rest timers, and Health Connect"
          />
          <SettingsLinkRow
            href={routes.settingsApp}
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
