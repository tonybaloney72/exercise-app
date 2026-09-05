"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type WorkoutRowMenuItem = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
};

interface WorkoutRowOverflowMenuProps {
  items: WorkoutRowMenuItem[];
  /** Shown when there are no actions (menu hidden). */
  visible?: boolean;
}

export default function WorkoutRowOverflowMenu({
  items,
  visible = true,
}: WorkoutRowOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const minWidth = 208;
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - minWidth - 8,
      );
      setMenuStyle({
        top: rect.bottom + 4,
        left,
        minWidth,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const menu = document.getElementById(listId);
      if (menu?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, listId]);

  if (!visible || items.length === 0) return null;

  const menu =
    open && menuStyle && typeof document !== "undefined"
      ? createPortal(
          <ul
            id={listId}
            role="menu"
            className="fixed z-200 overflow-hidden rounded-lg border border-accent/15 bg-surface-elevated py-1 shadow-xl shadow-black/25 ring-1 ring-black/10 light:shadow-black/10 light:ring-black/5"
            style={{
              top: menuStyle.top,
              left: menuStyle.left,
              minWidth: menuStyle.minWidth,
            }}
          >
            {items.map((item) => (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 whitespace-nowrap px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface-hover"
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {item.icon ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-border/60 hover:text-foreground"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listId}
        title="More actions"
        aria-label="More actions"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>
      {menu}
    </div>
  );
}
