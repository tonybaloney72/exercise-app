"use client";

import AnimatedSection from "@/components/common/AnimatedSection";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import AppearanceSettingsSection from "@/components/settings/AppearanceSettingsSection";
import CardioPermissionsSection from "@/components/settings/CardioPermissionsSection";
import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";
import TimersDeviceSettingsSection from "@/components/settings/TimersDeviceSettingsSection";
import { isNativePlatform } from "@/lib/capacitorRuntime";

const SECTION_BODY = "flex flex-col gap-4 p-4";

export default function DeviceSettingsPage() {
  const showHealthConnect = isNativePlatform();

  return (
    <SettingsSubpageLayout
      title="Device & timers"
      hint="Theme, rest timers, sounds, Health Connect, location, and notifications"
    >
      <div className="flex flex-col gap-5">
        <AnimatedSection>
          <CollapsibleSection
            title="Appearance"
            hint="Theme and visual preferences"
            defaultOpen
            contentClassName={SECTION_BODY}
          >
            <AppearanceSettingsSection />
          </CollapsibleSection>
        </AnimatedSection>

        <AnimatedSection delay={0.04}>
          <CollapsibleSection
            title="Timers & device"
            hint="Rest timers, sounds, vibration, and screen wake"
            defaultOpen={false}
            contentClassName={SECTION_BODY}
          >
            <TimersDeviceSettingsSection />
          </CollapsibleSection>
        </AnimatedSection>

        {showHealthConnect ? (
          <AnimatedSection delay={0.05}>
            <CollapsibleSection
              title="Permissions & connections"
              hint="Third-party apps and services you can connect to"
              defaultOpen={false}
              contentClassName={SECTION_BODY}
            >
              <CardioPermissionsSection />
            </CollapsibleSection>
          </AnimatedSection>
        ) : null}
      </div>
    </SettingsSubpageLayout>
  );
}
