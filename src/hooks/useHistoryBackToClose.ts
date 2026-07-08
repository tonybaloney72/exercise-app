"use client";

import { useEffect, useRef } from "react";

const OVERLAY_HISTORY_STATE = { __overlayBack: true } as const;

/** Open overlays sharing one history entry (modal swaps must not pop then re-push). */
let openOverlayCount = 0;
/** Ignore popstate from our own history.back() during overlay cleanup. */
let ignoreNextPopState = false;

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
  const pushedHistoryRef = useRef(false);

  useEffect(() => {
    if (!open || !enabled) return;

    openOverlayCount += 1;
    const shouldPushHistory = openOverlayCount === 1;
    if (shouldPushHistory) {
      window.history.pushState(OVERLAY_HISTORY_STATE, "");
      pushedHistoryRef.current = true;
    }

    const handlePopState = () => {
      if (ignoreNextPopState) {
        ignoreNextPopState = false;
        pushedHistoryRef.current = false;
        openOverlayCount = Math.max(0, openOverlayCount - 1);
        return;
      }
      pushedHistoryRef.current = false;
      openOverlayCount = Math.max(0, openOverlayCount - 1);
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      openOverlayCount = Math.max(0, openOverlayCount - 1);

      if (!shouldPushHistory || !pushedHistoryRef.current) return;

      pushedHistoryRef.current = false;

      // Defer so another overlay opening in the same commit can bump the count first.
      queueMicrotask(() => {
        if (openOverlayCount === 0) {
          ignoreNextPopState = true;
          window.history.back();
        }
      });
    };
  }, [open, enabled]);
}
