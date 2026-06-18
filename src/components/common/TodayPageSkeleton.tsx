import PlanCardSkeleton from "@/components/common/PlanCardSkeleton";

/** Placeholder while Today's plan or route shell is loading. */
export default function TodayPageSkeleton() {
  return (
    <div className="flex flex-col py-6 gap-5" aria-busy="true" aria-label="Loading today">
      <div className="flex flex-col gap-2 animate-pulse">
        <div className="h-3 w-24 rounded bg-border" />
        <div className="h-8 w-52 max-w-[80%] rounded bg-border" />
        <div className="h-4 w-full max-w-sm rounded bg-border/80" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-7 w-16 rounded-full bg-border animate-pulse"
          />
        ))}
      </div>
      <PlanCardSkeleton />
    </div>
  );
}
