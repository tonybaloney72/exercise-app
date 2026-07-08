"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFocusTrap, type FocusTrapInitialFocus } from "@/hooks/useFocusTrap";
import { useHistoryBackToClose } from "@/hooks/useHistoryBackToClose";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export type BottomSheetModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  hint?: string;
  ariaLabel?: string;
  children: ReactNode;
  /** Rendered below the title row (e.g. action toolbar). */
  headerExtra?: ReactNode;
  footer?: ReactNode;
  maxWidth?: "md" | "lg";
  panelClassName?: string;
  bodyClassName?: string;
  /** When false, backdrop clicks do not call onClose. Default true. */
  closeOnBackdropClick?: boolean;
  /** When false, hides the header close control. Default true. */
  showCloseButton?: boolean;
  /** When false, Escape does not call onClose. Default true. */
  closeOnEscape?: boolean;
  /**
   * When false, mobile / browser back does not close the modal.
   * Defaults to `closeOnEscape && showCloseButton`.
   */
  closeOnHistoryBack?: boolean;
  titleClassName?: string;
  hintClassName?: string;
  /**
   * `sheet` - slides up from the bottom on small screens (default).
   * `center` - centered dialog on all breakpoints.
   */
  placement?: "sheet" | "center";
  initialFocus?: FocusTrapInitialFocus;
};

/** Ignore backdrop dismiss briefly after open (mobile tap-through when swapping modals). */
const BACKDROP_CLOSE_GUARD_MS = 450;

const maxWidthClass: Record<
  NonNullable<BottomSheetModalProps["maxWidth"]>,
  string
> = {
  md: "max-w-md",
  lg: "max-w-lg",
};

export default function BottomSheetModal({
  open,
  onClose,
  title,
  hint,
  ariaLabel,
  children,
  headerExtra,
  footer,
  maxWidth = "md",
  panelClassName = "",
  bodyClassName = "",
  closeOnBackdropClick = true,
  showCloseButton = true,
  closeOnEscape = true,
  closeOnHistoryBack,
  titleClassName = "",
  hintClassName = "",
  placement = "sheet",
  initialFocus = "prefer-input",
}: BottomSheetModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropPointerDownRef = useRef(false);
  const backdropCloseAllowedAfterRef = useRef(0);
  const centered = placement === "center";
  const keyboardInset = useKeyboardInset(open && centered);
  const historyBackEnabled =
    closeOnHistoryBack ?? (closeOnEscape && showCloseButton);

  useEffect(() => {
    if (open) {
      backdropCloseAllowedAfterRef.current =
        performance.now() + BACKDROP_CLOSE_GUARD_MS;
    }
  }, [open]);

  useHistoryBackToClose(open, onClose, historyBackEnabled);

  useFocusTrap({
    open,
    containerRef: panelRef,
    onClose,
    closeOnEscape: closeOnEscape && showCloseButton,
    initialFocus,
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel ?? title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={
            centered
              ? keyboardInset > 0
                ? "fixed inset-0 z-60 flex items-end justify-center bg-black/70 px-4 pt-4"
                : "fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4"
              : "fixed inset-0 z-60 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          }
          style={
            centered && keyboardInset > 0
              ? { paddingBottom: keyboardInset + 16 }
              : undefined
          }
          onPointerDown={(event) => {
            backdropPointerDownRef.current = event.target === event.currentTarget;
          }}
          onClick={(event) => {
            if (
              closeOnBackdropClick &&
              event.target === event.currentTarget &&
              backdropPointerDownRef.current &&
              performance.now() >= backdropCloseAllowedAfterRef.current
            ) {
              onClose();
            }
            backdropPointerDownRef.current = false;
          }}
        >
          <motion.div
            ref={panelRef}
            initial={
              centered ? { scale: 0.96, opacity: 0 } : { y: 40, opacity: 0 }
            }
            animate={centered ? { scale: 1, opacity: 1 } : { y: 0, opacity: 1 }}
            exit={
              centered ? { scale: 0.96, opacity: 0 } : { y: 40, opacity: 0 }
            }
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={`flex max-h-[90vh] w-full ${maxWidthClass[maxWidth]} flex-col overflow-hidden border border-border bg-surface shadow-xl ${
              centered
                ? "max-h-[85vh] rounded-2xl"
                : "rounded-t-2xl sm:max-h-[85vh] sm:rounded-2xl"
            } ${panelClassName}`.trim()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h2
                  className={`text-sm font-semibold text-foreground ${titleClassName}`.trim()}
                >
                  {title}
                </h2>
                {hint ? (
                  <p
                    className={`mt-0.5 text-sm text-muted ${hintClassName}`.trim()}
                  >
                    {hint}
                  </p>
                ) : null}
              </div>
              {showCloseButton ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-full p-2 text-muted hover:bg-surface-hover hover:text-foreground"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              ) : null}
            </div>

            {headerExtra}

            <div
              className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${bodyClassName}`.trim()}
            >
              {children}
            </div>

            {footer ? (
              <div className="shrink-0 border-t border-border px-4 py-3">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
