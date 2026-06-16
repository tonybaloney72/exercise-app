"use client";

import { useState } from "react";

const authInputClassName =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted sm:px-4 sm:py-3";

function EyeIcon({ hidden }: { hidden?: boolean }) {
  if (hidden) {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

type AuthFieldProps = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  /** Show/hide toggle for password fields. */
  showPasswordToggle?: boolean;
};

export default function AuthField({
  id,
  label,
  type = "text",
  autoComplete,
  required,
  value,
  onChange,
  hint,
  showPasswordToggle = false,
}: AuthFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPasswordField = type === "password";
  const inputType =
    isPasswordField && showPasswordToggle
      ? passwordVisible
        ? "text"
        : "password"
      : type;

  const input = (
    <input
      id={id}
      name={id}
      type={inputType}
      autoComplete={autoComplete}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${authInputClassName}${showPasswordToggle && isPasswordField ? " pr-11 sm:pr-12" : ""}`}
    />
  );

  return (
    <div className="space-y-1 sm:space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      {showPasswordToggle && isPasswordField ? (
        <div className="relative">
          {input}
          <button
            type="button"
            onClick={() => setPasswordVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 min-w-[44px] items-center justify-center text-muted transition-colors hover:text-foreground sm:w-12"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-pressed={passwordVisible}
            aria-controls={id}
          >
            <EyeIcon hidden={passwordVisible} />
          </button>
        </div>
      ) : (
        input
      )}
      {hint ? <p className="text-caption text-muted">{hint}</p> : null}
    </div>
  );
}
