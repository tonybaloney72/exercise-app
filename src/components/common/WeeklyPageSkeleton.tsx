import PlanCardSkeleton from "@/components/common/PlanCardSkeleton";

export default function WeeklyPageSkeleton() {
  return (
    <div
      className="py-6 space-y-5 animate-pulse"
      aria-busy="true"
      aria-label="Loading weekly overview"
    >
      <div className="space-y-2">
        <div className="h-8 w-52 max-w-[80%] rounded bg-border" />
        <div className="h-4 w-64 max-w-full rounded bg-border/80" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-16 flex-1 rounded-xl bg-border/70" />
        ))}
      </div>
      <PlanCardSkeleton />
      <PlanCardSkeleton />
      <PlanCardSkeleton />
    </div>
  );
}
