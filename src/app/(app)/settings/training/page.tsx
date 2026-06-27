"use client";

import Link from "next/link";
import AnimatedSection from "@/components/common/AnimatedSection";
import EquipmentSettingsSection from "@/components/settings/EquipmentSettingsSection";
import ExerciseDifficultySettingsSection from "@/components/settings/ExerciseDifficultySettingsSection";
import SettingsSectionBlock from "@/components/settings/SettingsSectionBlock";
import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";
import YourWeekSettingsSection from "@/components/settings/YourWeekSettingsSection";
import { useAuthStore } from "@/stores/useAuthStore";

export default function TrainingSettingsPage() {
  const mode = useAuthStore((s) => s.mode);

  return (
    <SettingsSubpageLayout
      title="Training plan"
      hint="Week layout, difficulty, and equipment"
    >
      <div className="flex flex-col gap-8">
        <AnimatedSection>
          <SettingsSectionBlock
            title="Your week"
            hint="How your week is built"
          >
            {mode === "authenticated" ? (
              <YourWeekSettingsSection />
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted leading-relaxed">
                  Sign in to customize your program mode, weekly schedule, cardio
                  days, round density, and default stretches.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    className="rounded-lg border border-border bg-surface-hover py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-border/50"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg bg-accent py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-accent/90"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            )}
          </SettingsSectionBlock>
        </AnimatedSection>

        <AnimatedSection delay={0.04}>
          <SettingsSectionBlock
            title="Exercise difficulty"
            hint="Skill caps for generated plans and swap suggestions"
          >
            <ExerciseDifficultySettingsSection />
          </SettingsSectionBlock>
        </AnimatedSection>

        <AnimatedSection delay={0.05}>
          <SettingsSectionBlock
            title="Your equipment"
            hint="Library and weekly plan only show exercises you can do with gear you have"
          >
            <EquipmentSettingsSection />
          </SettingsSectionBlock>
        </AnimatedSection>
      </div>
    </SettingsSubpageLayout>
  );
}
