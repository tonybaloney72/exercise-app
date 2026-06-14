import { surfaceCardClassName } from "@/components/common/SurfaceCard";

export default function ProgressPageSkeleton() {
  return (
    <div
      className="py-6 space-y-5 animate-pulse"
      aria-busy="true"
      aria-label="Loading progress"
    >
      <div className="space-y-2">
        <div className="h-8 w-36 rounded bg-border" />
        <div className="h-4 w-48 rounded bg-border/80" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`${surfaceCardClassName} h-24 p-4`}>
            <div className="h-5 w-5 rounded bg-border/70" />
            <div className="mt-3 h-6 w-16 rounded bg-border" />
            <div className="mt-2 h-3 w-24 rounded bg-border/80" />
          </div>
        ))}
      </div>
      <div className={`${surfaceCardClassName} h-52 p-4`}>
        <div className="h-4 w-32 rounded bg-border" />
        <div className="mt-4 h-36 rounded-lg bg-border/60" />
      </div>
    </div>
  );
}
