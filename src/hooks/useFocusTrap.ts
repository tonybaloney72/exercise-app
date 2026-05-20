"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
  );
}

type Options = {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  /** When provided, Escape calls this (if closeOnEscape). */
  onClose?: () => void;
  closeOnEscape?: boolean;
};

/**
 * Trap Tab within the container while open; restore focus to the prior element on close.
 */
export function useFocusTrap({
  open,
  containerRef,
  onClose,
  closeOnEscape = true,
}: Options): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      const container = containerRef.current;
      if (!container) return;
      const nodes = getFocusableElements(container);
      const target = nodes[0] ?? container;
      if (target && typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    };

    const raf = requestAnimationFrame(focusFirst);

    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        closeOnEscape &&
        onClose &&
        !e.defaultPrevented
      ) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;

      const nodes = getFocusableElements(container);
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const prev = previousFocusRef.current;
      if (prev?.isConnected && typeof prev.focus === "function") {
        prev.focus({ preventScroll: true });
      }
    };
  }, [open, containerRef, onClose, closeOnEscape]);
}
