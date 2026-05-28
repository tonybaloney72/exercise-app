export const authInputClassName =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted sm:px-4 sm:py-3";

type AuthFieldProps = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
};

export default function AuthField({
  id,
  label,
  type = "text",
  autoComplete,
  autoFocus,
  required,
  value,
  onChange,
  hint,
}: AuthFieldProps) {
  return (
    <div className="space-y-1 sm:space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={authInputClassName}
      />
      {hint ? <p className="text-caption text-muted">{hint}</p> : null}
    </div>
  );
}
