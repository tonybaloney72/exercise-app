"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
};

/** Target prescription field under a plan editor exercise row. */
export default function PlanTargetField({ value, onChange, id }: Props) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-xs text-muted">Target</span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
      />
    </label>
  );
}
