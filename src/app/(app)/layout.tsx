import BottomNav from "@/components/layout/BottomNav";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
import AppDataSync from "@/components/layout/AppDataSync";
import PlanGeneratorInputsSync from "@/components/layout/PlanGeneratorInputsSync";
import AppSettingsSync from "@/components/layout/AppSettingsSync";
import WakeLockSync from "@/components/layout/WakeLockSync";
import AppToaster from "@/components/layout/AppToaster";
import PullToRefresh from "@/components/layout/PullToRefresh";
import AuthInitializer from "@/components/auth/AuthInitializer";
import NativeHealthBridgeInit from "@/components/layout/NativeHealthBridgeInit";
import WhatsNewSync from "@/components/layout/WhatsNewSync";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const isGuest = cookieStore.get(GUEST_COOKIE_NAME)?.value === "1";

  return (
    <>
      <AuthInitializer
        initialUser={user ? { id: user.id, email: user.email ?? null } : null}
        initialGuest={isGuest}
      />
      <AppSettingsSync />
      <PlanGeneratorInputsSync />
      <AppDataSync />
      <OnboardingGate />
      <WakeLockSync />
      <NativeHealthBridgeInit />
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
