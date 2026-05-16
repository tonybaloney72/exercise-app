import BottomNav from "@/components/layout/BottomNav";
import EquipmentOnboardingGate from "@/components/onboarding/EquipmentOnboardingGate";
import TrainingWeekRefreshBanner from "@/components/layout/TrainingWeekRefreshBanner";
import AppSettingsSync from "@/components/layout/AppSettingsSync";
import WakeLockSync from "@/components/layout/WakeLockSync";
import AuthInitializer from "@/components/auth/AuthInitializer";
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
      <EquipmentOnboardingGate />
      <WakeLockSync />
      <main className="flex-1 pb-20">
        <div className="mx-auto max-w-lg px-4">
          <TrainingWeekRefreshBanner />
          {children}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
