import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export const surfaceCardClassName =
  "rounded-xl border border-border bg-surface";

type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

const SurfaceCard = forwardRef<HTMLDivElement, SurfaceCardProps>(
  function SurfaceCard({ children, className = "", ...rest }, ref) {
    const merged = `${surfaceCardClassName} ${className}`.trim();
    return (
      <div ref={ref} className={merged} {...rest}>
        {children}
      </div>
    );
  },
);

export default SurfaceCard;
