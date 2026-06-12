"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import EquipmentPicker from "@/components/settings/EquipmentPicker";
import ExpertiseByGroupEditor from "@/components/settings/ExpertiseByGroupEditor";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { DEFAULT_EXPERTISE_BY_GROUP } from "@/lib/expertiseLevels";
import {
  deferOnboardingThisSession,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEP_ORDER,
  ONBOARDING_TAB_TOUR,
  onboardingStepIndex,
  type OnboardingStepId,
} from "@/lib/onboardingWizard";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ExerciseEquipment, ExpertiseByGroup } from "@/types";

type FinishOptions = {
  equipment: ExerciseEquipment[];
  expertiseByGroup: ExpertiseByGroup;
};

type Props = {
  onDeferred: () => void;
};

export default function OnboardingWizardModal({ onDeferred }: Props) {
  const router = useRouter();
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const savedEquipment = useSettingsStore((s) => s.availableEquipment);
  const savedExpertise = useSettingsStore((s) => s.expertiseByGroup);

  const [step, setStep] = useState<OnboardingStepId>("welcome");
  const [equipment, setEquipment] = useState<ExerciseEquipment[]>(() =>
    savedEquipment.length > 0
      ? [...savedEquipment]
      : [...DEFAULT_AVAILABLE_EQUIPMENT],
  );
  const [expertiseByGroup, setExpertiseByGroup] = useState<ExpertiseByGroup>(
    () => ({
      ...savedExpertise,
    }),
  );
  const [saving, setSaving] = useState(false);

  const stepNumber = onboardingStepIndex(step) + 1;

  const finish = useCallback(
    async (payload: FinishOptions, navigateTo?: string) => {
      setSaving(true);
      try {
        await updateSettings({
          availableEquipment: payload.equipment,
          expertiseByGroup: payload.expertiseByGroup,
          equipmentOnboardingCompleted: true,
        });
        if (navigateTo) router.push(navigateTo);
      } finally {
        setSaving(false);
      }
    },
    [router, updateSettings],
  );

  const finishDefaults = () =>
    finish({
      equipment: [...DEFAULT_AVAILABLE_EQUIPMENT],
      expertiseByGroup: { ...DEFAULT_EXPERTISE_BY_GROUP },
    });

  const finishWithDraft = (navigateTo?: string) =>
    finish({ equipment, expertiseByGroup }, navigateTo);

  const skipForNow = () => {
    deferOnboardingThisSession();
    onDeferred();
  };

  const goNext = () => {
    const i = onboardingStepIndex(step);
    if (i < ONBOARDING_STEP_ORDER.length - 1) {
      setStep(ONBOARDING_STEP_ORDER[i + 1]!);
    }
  };

  const goBack = () => {
    const i = onboardingStepIndex(step);
    if (i > 0) setStep(ONBOARDING_STEP_ORDER[i - 1]!);
  };

  const { title, hint, body } = stepContent(step);

  const footer = stepFooter({
    step,
    saving,
    equipmentCount: equipment.length,
    skipForNow,
    finishDefaults,
    finishWithDraft,
    goBack,
    goNext,
  });

  return (
    <BottomSheetModal
      open
      onClose={() => {}}
      closeOnBackdropClick={false}
      closeOnEscape={false}
      showCloseButton={false}
      title={title}
      titleClassName="text-lg"
      hint={hint}
      hintClassName="text-sm leading-relaxed"
      ariaLabel="App onboarding"
      maxWidth="lg"
      panelClassName="max-h-[min(90vh,680px)]"
      bodyClassName="overflow-y-auto px-4 py-4"
      headerExtra={
        step !== "welcome" ? (
          <p className="shrink-0 border-b border-border px-4 py-2 text-xs font-medium text-muted">
            Step {stepNumber} of {ONBOARDING_STEP_COUNT}
          </p>
        ) : null
      }
      footer={footer}
    >
      {body}
    </BottomSheetModal>
  );

  function stepContent(current: OnboardingStepId): {
    title: string;
    hint: string;
    body: ReactNode;
  } {
    switch (current) {
      case "welcome":
        return {
          title: "Welcome",
          hint: "A quick setup helps us tailor your library and weekly plan. Takes about a minute.",
          body: (
            <div className="space-y-4 text-sm text-foreground leading-relaxed">
              <p>
                You&apos;ll pick your skill level by muscle group, the equipment
                you have, and see how the main tabs work. The default week is a
                6-day push / pull / legs split-you can change that anytime.
              </p>
            </div>
          ),
        };
      case "expertise":
        return {
          title: "Your experience",
          hint: "Set a skill cap for each training group. We won’t prescribe moves above that level.",
          body: (
            <ExpertiseByGroupEditor
              variant="onboarding"
              byGroup={expertiseByGroup}
              onChange={setExpertiseByGroup}
            />
          ),
        };
      case "equipment":
        return {
          title: "Your equipment",
          hint: "We use this for the exercise library and when building your week.",
          body: (
            <EquipmentPicker selected={equipment} onChange={setEquipment} />
          ),
        };
      case "tour":
        return {
          title: "Around the app",
          hint: "Five tabs at the bottom-here’s what each one is for.",
          body: (
            <ul className="space-y-3">
              {ONBOARDING_TAB_TOUR.map((tab) => (
                <li
                  key={tab.label}
                  className="rounded-xl border border-border bg-surface-hover px-3 py-2.5"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {tab.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted leading-relaxed">
                    {tab.description}
                  </p>
                </li>
              ))}
            </ul>
          ),
        };
      case "week":
        return {
          title: "Your week",
          hint: "Default is 6-day push / pull / legs. Custom weeks let you guide or hand-pick exercises.",
          body: (
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-3">
                <p className="font-semibold text-foreground">
                  6-day P/P/L (recommended)
                </p>
                <p className="mt-1 text-xs text-muted">
                  Balanced push, pull, and leg days with configurable rest and
                  cardio. Great if you want a proven split without building from
                  scratch.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-hover px-3 py-3">
                <p className="font-semibold text-foreground">
                  Custom week - guided
                </p>
                <p className="mt-1 text-xs text-muted">
                  Step through a blueprint wizard: day themes, rounds, and
                  cardio per day. The app fills exercises from your settings.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-hover px-3 py-3">
                <p className="font-semibold text-foreground">
                  Custom week - manual
                </p>
                <p className="mt-1 text-xs text-muted">
                  Pick exercises yourself for each day-full control, more setup
                  time.
                </p>
              </div>
            </div>
          ),
        };
    }
  }
}

function stepFooter(args: {
  step: OnboardingStepId;
  saving: boolean;
  equipmentCount: number;
  skipForNow: () => void;
  finishDefaults: () => void;
  finishWithDraft: (navigateTo?: string) => void;
  goBack: () => void;
  goNext: () => void;
}) {
  const {
    step,
    saving,
    equipmentCount,
    skipForNow,
    finishDefaults,
    finishWithDraft,
    goBack,
    goNext,
  } = args;

  const deferBtn = (
    <button
      type="button"
      disabled={saving}
      onClick={skipForNow}
      className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
    >
      Skip for now
    </button>
  );

  if (step === "welcome") {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void finishDefaults()}
          className="order-3 sm:order-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
        >
          Skip setup
        </button>
        {deferBtn}
        <button
          type="button"
          disabled={saving}
          onClick={goNext}
          className="order-1 sm:order-3 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
        >
          Get started
        </button>
      </div>
    );
  }

  if (step === "week") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/weekly/build-guided"
            onClick={(e) => {
              e.preventDefault();
              void finishWithDraft("/weekly/build-guided");
            }}
            className="rounded-xl border border-border bg-surface-hover px-4 py-2.5 text-center text-sm font-medium text-foreground hover:border-accent/40"
          >
            Build guided week
          </Link>
          <Link
            href="/settings"
            onClick={(e) => {
              e.preventDefault();
              void finishWithDraft("/settings");
            }}
            className="rounded-xl border border-border bg-surface-hover px-4 py-2.5 text-center text-sm font-medium text-foreground hover:border-accent/40"
          >
            Open Settings
          </Link>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            disabled={saving}
            onClick={goBack}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
          >
            Back
          </button>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {deferBtn}
            <button
              type="button"
              disabled={saving}
              onClick={() => void finishWithDraft()}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Finish with P/P/L"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isEquipment = step === "equipment";
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
      <button
        type="button"
        disabled={saving}
        onClick={goBack}
        className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
      >
        Back
      </button>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {deferBtn}
        <button
          type="button"
          disabled={saving || (isEquipment && equipmentCount === 0)}
          onClick={goNext}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
