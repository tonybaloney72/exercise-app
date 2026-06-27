"use client";

import AnimatedSection from "@/components/common/AnimatedSection";
import AppearanceSettingsSection from "@/components/settings/AppearanceSettingsSection";
import CardioPermissionsSection from "@/components/settings/CardioPermissionsSection";
import SettingsSectionBlock from "@/components/settings/SettingsSectionBlock";
import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";
import TimersDeviceSettingsSection from "@/components/settings/TimersDeviceSettingsSection";
import { isNativePlatform } from "@/lib/capacitorRuntime";

export default function DeviceSettingsPage() {
  const showHealthConnect = isNativePlatform();

  return (
    <SettingsSubpageLayout
      title="Device & timers"
      hint="Theme, rest timers, sounds, and Health Connect"
    >
      <div className="flex flex-col gap-8">
        <AnimatedSection>
          <SettingsSectionBlock
            title="Appearance"
            hint="Theme and visual preferences"
          >
            <AppearanceSettingsSection />
          </SettingsSectionBlock>
        </AnimatedSection>

        <AnimatedSection delay={0.04}>
          <SettingsSectionBlock
            title="Timers & device"
            hint="Rest timers, sounds, vibration, and screen wake"
          >
            <TimersDeviceSettingsSection />
          </SettingsSectionBlock>
        </AnimatedSection>

        {showHealthConnect ? (
          <AnimatedSection delay={0.05}>
            <SettingsSectionBlock
              title="Permissions & connections"
              hint="Third-party apps and services you can connect to"
            >
              <CardioPermissionsSection />
            </SettingsSectionBlock>
          </AnimatedSection>
        ) : null}
      </div>
    </SettingsSubpageLayout>
  );
}
