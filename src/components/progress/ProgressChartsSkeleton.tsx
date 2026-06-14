import { surfaceCardClassName } from "@/components/common/SurfaceCard";

export default function ProgressChartsSkeleton() {
  return (
    <div
      className="space-y-5 animate-pulse"
      aria-busy="true"
      aria-label="Loading charts"
    >
      <div className={`${surfaceCardClassName} h-52 p-4`}>
        <div className="h-4 w-32 rounded bg-border" />
        <div className="mt-4 h-36 rounded-lg bg-border/60" />
      </div>
      <div className={`${surfaceCardClassName} h-52 p-4`}>
        <div className="h-4 w-40 rounded bg-border" />
        <div className="mt-4 h-36 rounded-lg bg-border/60" />
      </div>
    </div>
  );
}
