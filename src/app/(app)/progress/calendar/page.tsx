"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CalendarRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const month = searchParams.get("month");
    const target = month
      ? `/progress/history?month=${encodeURIComponent(month)}`
      : "/progress/history";
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="py-12 text-center text-sm text-muted">Opening history…</div>
  );
}

/** Legacy URL - history lives at `/progress/history`. */
export default function WorkoutHistoryCalendarRedirect() {
  return (
    <Suspense fallback={null}>
      <CalendarRedirectInner />
    </Suspense>
  );
}
