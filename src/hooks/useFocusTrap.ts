"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);
}

function preferredFocusTarget(nodes: HTMLElement[]): HTMLElement | undefined {
  return (
    nodes.find((el) => {
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }) ?? nodes[0]
  );
}

export type FocusTrapInitialFocus = "prefer-input" | "first" | "none";

type Options = {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  /** When provided, Escape calls this (if closeOnEscape). */
  onClose?: () => void;
  closeOnEscape?: boolean;
  /**
   * `prefer-input` - first input/textarea if present.
   * `first` - first focusable in DOM order (often the close button).
   * `none` - do not move focus on open (avoids mobile keyboard popping up; default).
   */
  initialFocus?: FocusTrapInitialFocus;
};

/**
 * Trap Tab within the container while open; restore focus to the prior element on close.
 * Initial focus runs once per open (stable even when `onClose` identity changes).
 */
export function useFocusTrap({
  open,
  containerRef,
  onClose,
  closeOnEscape = true,
  initialFocus = "none",
}: Options): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      if (initialFocus === "none") return;
      const container = containerRef.current;
      if (!container) return;
      const nodes = getFocusableElements(container);
      const target =
        initialFocus === "first"
          ? (nodes[0] ?? container)
          : (preferredFocusTarget(nodes) ?? nodes[0] ?? container);
      if (typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    };

    const raf = requestAnimationFrame(focusFirst);

    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        closeOnEscape &&
        onCloseRef.current &&
        !e.defaultPrevented
      ) {
        e.preventDefault();
        onCloseRef.current();
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

      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
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
  }, [open, containerRef, closeOnEscape, initialFocus]);
}
