import type { HTMLAttributes, ReactNode } from "react";

export const surfaceCardClassName =
  "rounded-xl border border-border bg-surface";

type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export default function SurfaceCard({
  children,
  className = "",
  ...rest
}: SurfaceCardProps) {
  const merged = `${surfaceCardClassName} ${className}`.trim();
  return (
    <div className={merged} {...rest}>
      {children}
    </div>
  );
}
