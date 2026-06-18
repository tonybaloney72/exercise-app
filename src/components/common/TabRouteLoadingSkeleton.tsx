import PlanCardSkeleton from "@/components/common/PlanCardSkeleton";

/** Instant shell shown by `app/(app)/loading.tsx` during tab navigation. */
export default function TabRouteLoadingSkeleton() {
  return (
    <div
      className="flex flex-col py-6 gap-5 animate-pulse"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="flex flex-col gap-2">
        <div className="h-8 w-44 max-w-[70%] rounded bg-border" />
        <div className="h-4 w-56 max-w-[85%] rounded bg-border/80" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 flex-1 rounded-xl bg-border/70" />
        ))}
      </div>
      <PlanCardSkeleton />
      <PlanCardSkeleton />
    </div>
  );
}
