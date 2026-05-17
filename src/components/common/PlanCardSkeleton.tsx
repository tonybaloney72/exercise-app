import { surfaceCardClassName } from "@/components/common/SurfaceCard";

type PlanCardSkeletonProps = {
  className?: string;
};

/** Placeholder matching weekly day cards / Today target-muscles card. */
export default function PlanCardSkeleton({
  className = "",
}: PlanCardSkeletonProps) {
  return (
    <div
      className={`${surfaceCardClassName} p-4 animate-pulse ${className}`.trim()}
      aria-busy="true"
      aria-label="Loading plan"
    >
      <div className="h-4 w-2/5 max-w-[140px] rounded bg-border" />
      <div className="mt-2 h-3 w-3/5 max-w-[200px] rounded bg-border/80" />
      <div className="mt-3 flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-border/70" />
        <div className="h-5 w-14 rounded-full bg-border/70" />
        <div className="h-5 w-12 rounded-full bg-border/60" />
      </div>
    </div>
  );
}
