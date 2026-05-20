"use client";

import { useEffect, useId, useRef, useState } from "react";

export type WorkoutRowMenuItem = {
  label: string;
  onClick: () => void;
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
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
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
  }, [open]);

  if (!visible || items.length === 0) return null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-border/60 hover:text-foreground"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listId}
        title="More actions"
        aria-label="More actions"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>
      {open && (
        <ul
          id={listId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-52 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className="w-full whitespace-nowrap px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-border/50"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
