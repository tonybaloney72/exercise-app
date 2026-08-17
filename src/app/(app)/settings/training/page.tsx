"use client";

import Link from "next/link";
import AnimatedSection from "@/components/common/AnimatedSection";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import EquipmentSettingsSection from "@/components/settings/EquipmentSettingsSection";
import ExerciseDifficultySettingsSection from "@/components/settings/ExerciseDifficultySettingsSection";
import RepProgressionSettingsSection from "@/components/settings/RepProgressionSettingsSection";
import SettingsSubpageLayout from "@/components/settings/SettingsSubpageLayout";
import YourWeekSettingsSection from "@/components/settings/YourWeekSettingsSection";
import { useAuthStore } from "@/stores/useAuthStore";

const SECTION_BODY = "flex flex-col gap-4 p-4";

export default function TrainingSettingsPage() {
  const mode = useAuthStore((s) => s.mode);

  return (
    <SettingsSubpageLayout
      title="Training plan"
      hint="Week layout, difficulty, equipment, and progression"
    >
      <div className="flex flex-col gap-5">
        <AnimatedSection>
          <CollapsibleSection
            title="Your week"
            hint="How your week is built"
            defaultOpen
            contentClassName={SECTION_BODY}
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
          </CollapsibleSection>
        </AnimatedSection>

        <AnimatedSection delay={0.04}>
          <CollapsibleSection
            title="Exercise difficulty"
            hint="Skill caps for generated plans and swap suggestions"
            defaultOpen={false}
            contentClassName={SECTION_BODY}
          >
            <ExerciseDifficultySettingsSection />
          </CollapsibleSection>
        </AnimatedSection>

        <AnimatedSection delay={0.05}>
          <CollapsibleSection
            title="Your equipment"
            hint="Gear you have, plus the free-weight sizes you own"
            defaultOpen={false}
            contentClassName={SECTION_BODY}
          >
            <EquipmentSettingsSection />
          </CollapsibleSection>
        </AnimatedSection>

        <AnimatedSection delay={0.06}>
          <CollapsibleSection
            title="Progression"
            hint="Library default increases after strong sessions"
            defaultOpen={false}
            contentClassName={SECTION_BODY}
          >
            <RepProgressionSettingsSection />
          </CollapsibleSection>
        </AnimatedSection>
      </div>
    </SettingsSubpageLayout>
  );
}
