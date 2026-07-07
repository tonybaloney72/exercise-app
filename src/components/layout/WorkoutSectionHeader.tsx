"use client";

import { usePathname } from "next/navigation";
import SectionHeaderTabs, {
  type SectionHeaderTab,
} from "@/components/common/SectionHeaderTabs";
import { routes } from "@/lib/appRoutes";
import { useWorkoutSubnavStore } from "@/stores/useWorkoutSubnavStore";

const WORKOUT_TABS: readonly SectionHeaderTab[] = [
  { id: "today", label: "Today", href: routes.workout },
  { id: "week", label: "Week", href: routes.workoutWeek },
  { id: "history", label: "History", href: routes.workoutHistory },
];

function workoutActiveTabId(pathname: string): string | null {
  if (pathname === routes.workout) return "today";
  if (pathname === routes.workoutWeek) return "week";
  if (pathname === routes.workoutHistory) return "history";
  return null;
}

export default function WorkoutSectionHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSiblingTabs = useWorkoutSubnavStore((s) => s.hideSiblingTabs);
  const activeId = workoutActiveTabId(pathname);
  const showTabs = activeId != null;

  return (
    <>
      {showTabs ? (
        <SectionHeaderTabs
          tabs={WORKOUT_TABS}
          activeId={activeId}
          hiddenTabIds={hideSiblingTabs ? ["week", "history"] : []}
          ariaLabel="Workout views"
          className="pt-6"
        />
      ) : null}
      <div className={showTabs ? "pb-6" : undefined}>{children}</div>
    </>
  );
}
