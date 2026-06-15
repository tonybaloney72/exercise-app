"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AnimatedSection from "@/components/common/AnimatedSection";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import { useSettingsStore } from "@/stores/useSettingsStore";
import AboutDeveloperSection from "@/components/settings/AboutDeveloperSection";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import SettingsFeedbackSection from "@/components/settings/SettingsFeedbackSection";
import SettingsLegalLinks from "@/components/settings/SettingsLegalLinks";
import DefaultStretchesModal from "@/components/settings/DefaultStretchesModal";
import EquipmentPicker from "@/components/settings/EquipmentPicker";
import { buildStretchResolveContextFromStores } from "@/adapters/stretchResolveContextFromStores";
import { ROUND_DENSITY_OPTIONS } from "@/lib/programProfile";
import { PPL_ROUND_DENSITY_OPTIONS } from "@/lib/pplRoundDensity";
import {
  pplWeeklyCardioEligibleDaysFromSchedule,
  resolveWeeklyPplSchedule,
  sanitizePplWeeklyCardioByDayForSchedule,
} from "@/lib/pplWeekSchedule";
import ProgramModeSelector from "@/components/settings/ProgramModeSelector";
import CustomBuildStyleSelector from "@/components/settings/CustomBuildStyleSelector";
import WeekBuilderMigrationBanner from "@/components/settings/WeekBuilderMigrationBanner";
import ExpertiseByGroupEditor from "@/components/settings/ExpertiseByGroupEditor";
import PplWeekScheduleEditor from "@/components/settings/PplWeekScheduleEditor";
import type { CustomBuildStyle } from "@/lib/weekBlueprint";
import WeeklyCardioEditor from "@/components/settings/WeeklyCardioEditor";
import type { ProgramMode } from "@/lib/weeklyCategoryLayout";
import type { UserSettings } from "@/types";
import { useAuthStore } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { createClient } from "@/lib/supabase/client";
export default function SettingsPage() {
  const router = useRouter();
  const settings = useSettingsStore();
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const setGuest = useAuthStore((s) => s.setGuest);
  const [stretchModalOpen, setStretchModalOpen] = useState(false);

  const exercisePrefs = useExercisePreferencesStore((s) => s.byExerciseId);

  const effectiveStretchDefaults = useMemo(() => {
    if (!settings.hydrated) return { warm: 0, cool: 0 };
    const ctx = buildStretchResolveContextFromStores();
    return {
      warm: ctx.defaultWarmUp.length,
      cool: ctx.defaultCoolDown.length,
    };
  }, [
    settings.hydrated,
    settings.defaultWarmUp,
    settings.defaultCoolDown,
    settings.availableEquipment,
    exercisePrefs,
  ]);
  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  async function handleExitGuest() {
    await fetch("/api/auth/guest", { method: "DELETE" });
    setGuest(false);
    router.refresh();
    router.push("/");
  }

  return (
    <div className="py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-1">Customize your experience</p>
      </div>

      {/* Account */}
      <AnimatedSection>
        <CollapsibleSection
          title="Account"
          defaultOpen
          contentClassName="space-y-3 p-4"
        >
          {mode === "authenticated" && user && (
            <>
              <div>
                <p className="text-xs text-muted">Signed in as</p>
                <p className="text-sm text-foreground break-all">
                  {user.email}
                </p>
              </div>
              <ChangePasswordSection email={user.email ?? ""} />
              <button
                onClick={handleSignOut}
                className="w-full rounded-lg border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border/50"
              >
                Sign out
              </button>
              <DeleteAccountSection />
              <SettingsLegalLinks />
            </>
          )}

          {mode === "guest" && (
            <>
              <div>
                <p className="text-xs text-muted">Mode</p>
                <p className="text-sm text-foreground">
                  Guest - data is stored on this device only.
                </p>
              </div>
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
              <button
                onClick={handleExitGuest}
                className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
              >
                Exit guest mode
              </button>
              <SettingsLegalLinks />
            </>
          )}

          {(mode === "loading" || mode === "anonymous") && (
            <p className="text-xs text-muted">Loading account…</p>
          )}
        </CollapsibleSection>
      </AnimatedSection>

      {/* Appearance */}
      <AnimatedSection delay={0.04}>
        <CollapsibleSection
          title="Appearance"
          hint="Theme and visual preferences"
          defaultOpen={false}
          contentClassName="p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Dark mode</p>
              <p className="text-xs text-muted mt-0.5">
                Turn off for a light background across the app
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.darkMode}
              onClick={() =>
                settings.updateSettings({ darkMode: !settings.darkMode })
              }
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                settings.darkMode ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  settings.darkMode ? "translate-x-6" : "translate-x-0"
                }`}
              />
              <span className="sr-only">
                {settings.darkMode ? "On" : "Off"}
              </span>
            </button>
          </div>
        </CollapsibleSection>
      </AnimatedSection>

      {/* Timers & device */}
      <AnimatedSection delay={0.045}>
        <CollapsibleSection
          title="Timers & device"
          hint="Rest timers, sounds, vibration, and screen wake"
          defaultOpen={false}
          contentClassName="space-y-4 p-4"
        >
          <div>
            <p className="text-xs font-semibold text-foreground">
              Rest between rounds
            </p>
            <p className="text-xs text-muted mt-0.5 mb-2">
              Default countdown length when you start a rest timer.
            </p>
            <div
              className="flex gap-2"
              role="group"
              aria-label="Rest between rounds in seconds"
            >
              {[60, 75, 90, 120].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() =>
                    settings.updateSettings({ restBetweenRounds: val })
                  }
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    settings.restBetweenRounds === val
                      ? "bg-accent text-white"
                      : "bg-surface-hover text-muted hover:text-foreground border border-border"
                  }`}
                >
                  {val}s
                </button>
              ))}
            </div>
          </div>
          <SettingsSwitch
            title="Auto-start rest timer"
            description="When you finish a round, open the rest countdown immediately. Turn off to tap Start rest on the round card instead."
            checked={settings.restTimerAutoStart}
            onChange={() =>
              settings.updateSettings({
                restTimerAutoStart: !settings.restTimerAutoStart,
              })
            }
          />
          <SettingsSwitch
            title="Timer sounds"
            description="Play a short chime when a set timer, rest timer, or similar countdown finishes."
            checked={settings.timerSoundsEnabled}
            onChange={() =>
              settings.updateSettings({
                timerSoundsEnabled: !settings.timerSoundsEnabled,
              })
            }
          />
          <SettingsSwitch
            title="Timer & exercise vibration"
            description="Brief vibration when a timer finishes or you mark an exercise complete (if your device supports it)."
            checked={settings.timerVibrationEnabled}
            onChange={() =>
              settings.updateSettings({
                timerVibrationEnabled: !settings.timerVibrationEnabled,
              })
            }
          />
          <SettingsSwitch
            title="Keep screen on"
            description="Try to prevent the screen from dimming while this app is open. Rest and set timers also keep the screen awake while running."
            checked={settings.keepScreenAwake}
            onChange={() =>
              settings.updateSettings({
                keepScreenAwake: !settings.keepScreenAwake,
              })
            }
          />
        </CollapsibleSection>
      </AnimatedSection>

      {/* Equipment */}
      <AnimatedSection delay={0.048}>
        <CollapsibleSection
          title="Your equipment"
          hint="Library and weekly plan only show exercises you can do with gear you have"
          defaultOpen={false}
          contentClassName="space-y-3 p-4"
        >
          <p className="text-xs text-muted">
            {mode === "guest" && (
              <>
                As a guest, equipment changes regenerate this device&apos;s
                current week in memory only (not saved across devices). Sign in
                to persist your week.{" "}
              </>
            )}
          </p>
          <EquipmentPicker
            selected={settings.availableEquipment}
            onChange={(next) =>
              void settings.updateSettings({ availableEquipment: next })
            }
          />
        </CollapsibleSection>
      </AnimatedSection>

      {/* Skill level caps */}
      <AnimatedSection delay={0.048}>
        <CollapsibleSection
          title="Exercise difficulty"
          hint="Skill caps for generated plans and swap suggestions"
          defaultOpen={false}
          contentClassName="space-y-3 p-4"
        >
          <ExpertiseByGroupEditor
            byGroup={settings.expertiseByGroup}
            onChange={(expertiseByGroup) => {
              void settings.updateSettings({ expertiseByGroup });
            }}
          />
        </CollapsibleSection>
      </AnimatedSection>

      {/* Week builder (signed-in) */}
      {mode === "authenticated" && (
        <AnimatedSection delay={0.049}>
          <CollapsibleSection
            title="Your week"
            hint="How your week is built."
            defaultOpen={false}
            contentClassName="space-y-4 p-4"
          >
            {!settings.weekBuilderMigrationAcknowledged ? (
              <WeekBuilderMigrationBanner
                onDismiss={() =>
                  void settings.updateSettings({
                    weekBuilderMigrationAcknowledged: true,
                  })
                }
              />
            ) : null}

            <ProgramModeSelector
              value={settings.programMode}
              onChange={(programMode: ProgramMode) => {
                const patch: Partial<UserSettings> = { programMode };
                if (
                  programMode === "custom" &&
                  settings.programMode !== "custom"
                ) {
                  patch.customBuildStyle = "guided";
                }
                void settings.updateSettings(patch);
              }}
            />

            {settings.programMode === "custom" ? (
              <CustomBuildStyleSelector
                value={settings.customBuildStyle}
                onChange={(customBuildStyle: CustomBuildStyle) =>
                  void settings.updateSettings({ customBuildStyle })
                }
              />
            ) : null}

            {settings.programMode === "custom" &&
            settings.customBuildStyle === "manual" ? (
              <div className="flex flex-col gap-2">
                <Link
                  href="/weekly/build"
                  className="w-full rounded-xl bg-accent py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                >
                  Open week builder
                </Link>
                <p className="text-xs text-muted leading-snug">
                  Pick every exercise yourself, or start from a template
                  (upper/lower or PPL) and tweak in the editor.
                </p>
              </div>
            ) : null}

            {settings.programMode === "custom" &&
            settings.customBuildStyle === "guided" ? (
              <div className="flex flex-col gap-2">
                <Link
                  href="/weekly/build-guided"
                  className="w-full rounded-xl bg-accent py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                >
                  Plan guided week
                </Link>
                <p className="text-xs text-muted leading-snug">
                  Walk through Sun–Sat: day type, rounds, groups per round, and
                  optional cardio. We generate exercises from your plan.
                </p>
              </div>
            ) : null}

            {settings.programMode === "preset" ? (
              <CollapsibleSection
                embedded
                title="Week schedule"
                hint=""
                defaultOpen
              >
                <PplWeekScheduleEditor
                  value={settings.weeklyPplSchedule}
                  onChange={(
                    weeklyPplSchedule,
                    weeklyPplScheduleCustomized,
                  ) => {
                    void settings.updateSettings({
                      weeklyPplSchedule,
                      weeklyPplScheduleCustomized,
                    });
                  }}
                />
              </CollapsibleSection>
            ) : null}
            {settings.programMode !== "custom" ? (
              <CollapsibleSection
                embedded
                title="Cardio & endurance"
                hint={
                  settings.programMode === "preset"
                    ? "Push and pull days: pick jog, walk, cycle, etc."
                    : "Jog, walk, cycle, hike, or swim per day - log time and distance in the workout."
                }
                defaultOpen={false}
              >
                <WeeklyCardioEditor
                  value={settings.weeklyCardioByDay}
                  editableDays={
                    settings.programMode === "preset"
                      ? pplWeeklyCardioEligibleDaysFromSchedule(
                          resolveWeeklyPplSchedule(settings),
                        )
                      : undefined
                  }
                  onChange={(weeklyCardioByDay, weeklyCardioCustomized) => {
                    const next =
                      settings.programMode === "preset"
                        ? sanitizePplWeeklyCardioByDayForSchedule(
                            weeklyCardioByDay,
                            resolveWeeklyPplSchedule(settings),
                          )
                        : weeklyCardioByDay;
                    void settings.updateSettings({
                      weeklyCardioByDay: next,
                      weeklyCardioCustomized,
                    });
                  }}
                />
              </CollapsibleSection>
            ) : null}
            {settings.programMode !== "custom" && (
              <>
                <CollapsibleSection
                  embedded
                  title="Round density"
                  hint={
                    settings.programMode === "preset"
                      ? "Exercises per working round (rounds 1–3) and size of the leg-day core block"
                      : "How many exercises per round when your week is generated"
                  }
                  defaultOpen={false}
                >
                  <div
                    className="space-y-2"
                    role="radiogroup"
                    aria-label="Round density"
                  >
                    {(settings.programMode === "preset"
                      ? PPL_ROUND_DENSITY_OPTIONS
                      : ROUND_DENSITY_OPTIONS
                    ).map((option) => {
                      const selected = settings.roundDensity === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() =>
                            void settings.updateSettings({
                              roundDensity: option.value,
                            })
                          }
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            selected
                              ? "border-accent bg-accent/10"
                              : "border-border bg-surface-hover hover:border-accent/30"
                          }`}
                        >
                          <span
                            className={`block text-sm font-medium ${
                              selected ? "text-accent" : "text-foreground"
                            }`}
                          >
                            {option.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-muted">
                            {option.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleSection>
              </>
            )}
            <CollapsibleSection
              embedded
              title="Default stretches"
              hint="Always included in warm-up / cool-down when a day is built"
              defaultOpen={false}
            >
              <p className="text-xs text-muted">
                Start empty and add your own; disliked Library exercises are
                excluded.
              </p>
              <p className="text-xs text-foreground">
                {effectiveStretchDefaults.warm === 0 &&
                effectiveStretchDefaults.cool === 0
                  ? "None selected - focus-based stretches still apply per day."
                  : `${effectiveStretchDefaults.warm} warm-up · ${effectiveStretchDefaults.cool} cool-down`}
              </p>
              <button
                type="button"
                onClick={() => setStretchModalOpen(true)}
                className="w-full rounded-xl border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10"
              >
                Edit default stretches
              </button>
            </CollapsibleSection>
          </CollapsibleSection>
        </AnimatedSection>
      )}

      <AnimatedSection delay={0.05}>
        <CollapsibleSection
          title="Feedback"
          hint="Bugs, ideas, and confusing UX"
          defaultOpen={false}
          contentClassName="space-y-3 p-4"
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

      <DefaultStretchesModal
        open={stretchModalOpen}
        onClose={() => setStretchModalOpen(false)}
      />
    </div>
  );
}

function SettingsSwitch({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          checked ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

function ChangePasswordSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    if (next === current) {
      setError("New password must be different from your current one.");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    // Reauthenticate by signing in with the provided current password.
    // Supabase doesn't ship a dedicated reauth API for email/password.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInError) {
      setError("Current password is incorrect.");
      setBusy(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: next,
    });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    setSuccess(true);
    setBusy(false);
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="w-full rounded-lg border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border/50"
      >
        Change password
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 border-t border-border pt-3"
    >
      <PasswordField
        id="current-password"
        label="Current password"
        autoComplete="current-password"
        value={current}
        onChange={setCurrent}
      />
      <PasswordField
        id="new-password"
        label="New password"
        autoComplete="new-password"
        value={next}
        onChange={setNext}
        hint="At least 8 characters"
      />
      <PasswordField
        id="confirm-new-password"
        label="Confirm new password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
      />

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-400" role="status">
          Password updated.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="flex-1 rounded-lg border border-border bg-surface-hover py-2 text-sm font-medium text-muted transition-colors hover:bg-border/50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-accent py-2 text-sm font-bold text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted"
      />
      {hint && <p className="text-caption text-muted">{hint}</p>}
    </div>
  );
}
