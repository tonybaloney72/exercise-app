"use client";

import { useEffect, useRef } from "react";

const OVERLAY_HISTORY_STATE = { __overlayBack: true } as const;

/**
 * While `open`, push a history entry so mobile / hardware back closes the overlay
 * (popstate) instead of leaving the page. Cleans up the entry when closed via UI.
 */
export function useHistoryBackToClose(
  open: boolean,
  onClose: () => void,
  enabled = true,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!open || !enabled) return;

    window.history.pushState(OVERLAY_HISTORY_STATE, "");
    pushedRef.current = true;

    const handlePopState = () => {
      pushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushedRef.current) {
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, [open, enabled]);
}
