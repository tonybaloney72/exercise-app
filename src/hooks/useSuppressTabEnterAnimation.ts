"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { isMainTabRoute } from "@/lib/tabRoutes";

/** Survives tab remounts so the next tab can detect a bottom-nav switch. */
let previousTabPathname: string | null = null;

/** True for one mount cycle after switching between bottom-nav tab roots. */
export function useSuppressTabEnterAnimation(): boolean {
  const pathname = usePathname();
  const previous = previousTabPathname;

  const suppress =
    previous !== null &&
    previous !== pathname &&
    isMainTabRoute(previous) &&
    isMainTabRoute(pathname);

  useLayoutEffect(() => {
    previousTabPathname = pathname;
  }, [pathname]);

  return suppress;
}
