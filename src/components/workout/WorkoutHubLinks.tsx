import Link from "next/link";
import { routes } from "@/lib/appRoutes";

export default function WorkoutHubLinks() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Link
        href={routes.workoutWeek}
        className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-surface-hover"
      >
        Week
      </Link>
      <Link
        href={routes.workoutHistory}
        className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-surface-hover"
      >
        History
      </Link>
    </div>
  );
}
