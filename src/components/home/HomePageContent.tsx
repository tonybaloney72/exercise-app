"use client";

import TabEnterMotion from "@/components/common/TabEnterMotion";
import QuickMealLog from "@/components/home/QuickMealLog";
import QuickActivityLog from "@/components/workout/QuickActivityLog";
import WeightLogCard from "@/components/workout/WeightLogCard";
import { formatLocalDateKey, parseLocalDateKey } from "@/utils/localDateKey";

function formatHomeDateHeading(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return dateKey;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function HomePageContent() {
  const todayKey = formatLocalDateKey();

  return (
    <div className="flex flex-col gap-3 py-6">
      <TabEnterMotion y={-10}>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold text-foreground">Home</h1>
          <p className="text-sm text-muted">{formatHomeDateHeading(todayKey)}</p>
        </div>
      </TabEnterMotion>

      <TabEnterMotion delay={0.06} className="flex flex-col gap-3">
        <QuickActivityLog dateKey={todayKey} />
        <WeightLogCard dateKey={todayKey} />
        <QuickMealLog dateKey={todayKey} />
      </TabEnterMotion>
    </div>
  );
}
