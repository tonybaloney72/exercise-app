"use client";

import { useRouter } from "next/navigation";

const DEFAULT_LINK_CLASS =
  "inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Navigate to the previous history entry, with an optional fallback when history is empty. */
export function useNavigateBack(fallbackHref?: string) {
  const router = useRouter();
  return () => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1
    ) {
      router.back();
      return;
    }
    if (fallbackHref) {
      router.push(fallbackHref);
      return;
    }
    router.back();
  };
}

type BackNavLinkProps = {
  label?: string;
  className?: string;
  /** When false, label is shown as-is (e.g. already includes ←). Default true. */
  prefixArrow?: boolean;
  fallbackHref?: string;
};

export default function BackNavLink({
  label = "Back",
  className = DEFAULT_LINK_CLASS,
  prefixArrow = true,
  fallbackHref,
}: BackNavLinkProps) {
  const navigateBack = useNavigateBack(fallbackHref);

  return (
    <a
      href={fallbackHref ?? "/"}
      onClick={(event) => {
        event.preventDefault();
        navigateBack();
      }}
      className={className}
    >
      {prefixArrow && !label.startsWith("←") ? (
        <>
          <span aria-hidden>←</span>
          {label}
        </>
      ) : (
        label
      )}
    </a>
  );
}
