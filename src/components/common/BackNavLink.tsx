"use client";

import { useRouter } from "next/navigation";

const BACK_NAV_LINK_CLASS =
  "inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function BackArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

type BackNavLinkProps = {
  className?: string;
  /**
   * When set, always navigate here (skip browser history).
   * Use for hub screens like Weekly where history.back() can walk through
   * edit → start → complete stacks.
   */
  href?: string;
  /** Used when `href` is unset: history.back(), or push here if no history. */
  fallbackHref?: string;
};

export default function BackNavLink({
  className = BACK_NAV_LINK_CLASS,
  href,
  fallbackHref,
}: BackNavLinkProps) {
  const router = useRouter();
  const anchorHref = href ?? fallbackHref ?? "#";

  return (
    <a
      href={anchorHref}
      onClick={(event) => {
        event.preventDefault();
        if (href) {
          router.push(href);
          return;
        }
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        if (fallbackHref) {
          router.push(fallbackHref);
          return;
        }
        router.back();
      }}
      className={className}
    >
      <BackArrowIcon />
      Back
    </a>
  );
}
