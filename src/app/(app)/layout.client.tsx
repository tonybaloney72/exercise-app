"use client";

import BottomNav from "@/components/layout/BottomNav";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
import AppDataSync from "@/components/layout/AppDataSync";
import PlanGeneratorInputsSync from "@/components/layout/PlanGeneratorInputsSync";
import AppSettingsSync from "@/components/layout/AppSettingsSync";
import WakeLockSync from "@/components/layout/WakeLockSync";
import AppToaster from "@/components/layout/AppToaster";
import PullToRefresh from "@/components/layout/PullToRefresh";
import AuthInitializer from "@/components/auth/AuthInitializer";
import WhatsNewSync from "@/components/layout/WhatsNewSync";

/**
 * Client-only app shell for Capacitor static export (`CAPACITOR_BUILD=1`).
 * Web builds use the server layout in `layout.tsx` for faster auth hydration.
 */
export default function CapacitorAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthInitializer initialUser={null} initialGuest={false} clientBootstrap />
      <AppSettingsSync />
      <PlanGeneratorInputsSync />
      <AppDataSync />
      <OnboardingGate />
      <WakeLockSync />
      <WhatsNewSync />
      <AppToaster />
      <PullToRefresh />
      <main className="flex-1 pb-20">
        <div className="mx-auto max-w-lg px-4">{children}</div>
      </main>
      <BottomNav />
    </>
  );
}
