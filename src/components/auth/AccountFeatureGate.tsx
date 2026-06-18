"use client";

import Link from "next/link";
import {
  ACCOUNT_FEATURE_COPY,
  type AccountGatedFeature,
} from "@/lib/accountFeatureGateCopy";

type Props = {
  /** Use a preset feature key for default title, description, and benefits. */
  feature?: AccountGatedFeature;
  title?: string;
  description?: string;
  benefits?: string[];
  className?: string;
};

export default function AccountFeatureGate({
  feature,
  title: titleOverride,
  description: descriptionOverride,
  benefits: benefitsOverride,
  className = "",
}: Props) {
  const preset = feature ? ACCOUNT_FEATURE_COPY[feature] : null;
  const title = titleOverride ?? preset?.title ?? "Requires an account";
  const description =
    descriptionOverride ??
    preset?.description ??
    "Create a free account to save your plan and unlock personalization.";
  const benefits = benefitsOverride ?? preset?.benefits ?? [];

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 ${className}`.trim()}
      role="region"
      aria-label={title}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted leading-relaxed">{description}</p>
      </div>
      {benefits.length > 0 ? (
        <ul className="flex flex-col text-xs text-muted gap-1 list-disc pl-4">
          {benefits.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/login"
          className="rounded-lg border border-border bg-surface py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-accent py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-accent/90"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
