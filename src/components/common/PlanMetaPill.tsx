import type { ReactNode } from "react";

type PlanMetaPillVariant = "today" | "done" | "cardio" | "rest";

const VARIANT_CLASS: Record<PlanMetaPillVariant, string> = {
  today: "bg-accent/20 text-accent light:bg-indigo-100 light:text-indigo-900",
  done: "bg-green-500/20 text-green-400 light:bg-green-100 light:text-green-900",
  cardio: "bg-sky-500/20 text-sky-400 light:bg-sky-100 light:text-sky-900",
  rest: "bg-muted/30 text-muted light:bg-slate-100 light:text-slate-700",
};

const BASE_CLASS =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";

type Props = {
  variant: PlanMetaPillVariant;
  children: ReactNode;
  className?: string;
};

export default function PlanMetaPill({
  variant,
  children,
  className = "",
}: Props) {
  return (
    <span className={`${BASE_CLASS} ${VARIANT_CLASS[variant]} ${className}`.trim()}>
      {children}
    </span>
  );
}
