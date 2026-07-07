"use client";

import { usePathname } from "next/navigation";
import SectionHeaderTabs, {
  type SectionHeaderTab,
} from "@/components/common/SectionHeaderTabs";
import { routes } from "@/lib/appRoutes";

const HEALTH_TABS: readonly SectionHeaderTab[] = [
  { id: "health", label: "Health", href: routes.health },
  { id: "exercises", label: "Exercises", href: routes.healthExercises },
];

function healthActiveTabId(pathname: string): string | null {
  if (pathname === routes.health) return "health";
  if (pathname === routes.healthExercises) return "exercises";
  return null;
}

export default function HealthSectionHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeId = healthActiveTabId(pathname);
  const showTabs = activeId != null;

  return (
    <>
      {showTabs ? (
        <SectionHeaderTabs
          tabs={HEALTH_TABS}
          activeId={activeId}
          ariaLabel="Health views"
          className="pt-6"
        />
      ) : null}
      <div className={showTabs ? "pb-6" : undefined}>{children}</div>
    </>
  );
}
