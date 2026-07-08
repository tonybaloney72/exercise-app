import Link from "next/link";
import FatSecretAttributionSnippet from "@/components/nutrition/FatSecretAttributionSnippet";
import { LEGAL_LAST_UPDATED } from "@/data/legal";

type LegalDocumentLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export default function LegalDocumentLayout({
  title,
  children,
}: LegalDocumentLayoutProps) {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-12">
        <p className="mb-6">
          <Link
            href="/"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            ← Back to MyExercise
          </Link>
        </p>

        <header className="flex flex-col mb-8 gap-2 border-b border-border pb-6">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="text-sm text-muted">Last updated: {LEGAL_LAST_UPDATED}</p>
        </header>

        <div className="flex flex-col legal-prose gap-6 text-sm leading-relaxed text-foreground sm:text-base">
          {children}
        </div>

        <footer className="mt-10 flex flex-col gap-4 border-t border-border py-6 text-sm text-muted">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <span aria-hidden>·</span>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
          </div>
          <FatSecretAttributionSnippet className="text-xs [&_a]:text-muted [&_a]:transition-colors [&_a]:hover:text-foreground" />
        </footer>
      </div>
    </main>
  );
}
