"use client";

import { motion } from "framer-motion";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  sublabel?: string;
  disabled?: boolean;
}

export default function Checkbox({ checked, onChange, label, sublabel, disabled }: CheckboxProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-hover active:bg-surface-hover disabled:opacity-50"
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
          checked
            ? "border-accent bg-accent"
            : "border-border bg-transparent"
        }`}
      >
        {checked && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 7.5L5.5 10.5L11.5 3.5" />
          </motion.svg>
        )}
      </div>
      {(label || sublabel) && (
        <div className="flex-1 min-w-0">
          {label && (
            <p className={`text-sm font-medium transition-all ${checked ? "text-muted line-through" : "text-foreground"}`}>
              {label}
            </p>
          )}
          {sublabel && (
            <p className="text-xs text-muted truncate">{sublabel}</p>
          )}
        </div>
      )}
    </button>
  );
}
