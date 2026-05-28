"use client";

import CollapsibleSection from "@/components/common/CollapsibleSection";
import {
  DEVELOPER_BIO,
  DEVELOPER_LINKS,
  DEVELOPER_LINKS_NEW_TAB,
  DEVELOPER_NAME,
  DEVELOPER_TAGLINE,
} from "@/data/developer";
import packageJson from "../../../package.json";

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function AboutDeveloperSection() {
  const linkTarget = DEVELOPER_LINKS_NEW_TAB ? "_blank" : undefined;
  const linkRel = DEVELOPER_LINKS_NEW_TAB ? "noopener noreferrer" : undefined;

  return (
    <CollapsibleSection
      title="About the developer"
      hint="Who built this app"
      defaultOpen={false}
      contentClassName="space-y-4 p-4"
    >
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{DEVELOPER_NAME}</p>
        <p className="text-sm text-accent">{DEVELOPER_TAGLINE}</p>
      </div>
      <p className="text-sm leading-relaxed text-muted">{DEVELOPER_BIO}</p>
      <ul className="space-y-2" aria-label="Developer links">
        {DEVELOPER_LINKS.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target={linkTarget}
              rel={linkRel}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10"
            >
              <span>{link.label}</span>
              <ExternalLinkIcon />
            </a>
          </li>
        ))}
      </ul>
      <p className="text-caption text-muted">
        My Exercise · v{packageJson.version}
      </p>
    </CollapsibleSection>
  );
}
