"use client";

import AnimatedSection from "@/components/common/AnimatedSection";
import BodyProfileSettingsSection from "@/components/settings/BodyProfileSettingsSection";
import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";

export default function BodySettingsPage() {
  return (
    <SettingsSubpageLayout
      title="Body & weight"
      hint="Profile for passive calorie estimates and daily weight logging"
    >
      <AnimatedSection>
        <BodyProfileSettingsSection />
      </AnimatedSection>
    </SettingsSubpageLayout>
  );
}
