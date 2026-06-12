import Link from "next/link";

export default function SettingsLegalLinks() {
  return (
    <p className="text-center text-xs text-muted pt-1">
      <Link href="/privacy" className="hover:text-foreground">
        Privacy
      </Link>
      <span aria-hidden className="mx-2">
        ·
      </span>
      <Link href="/terms" className="hover:text-foreground">
        Terms
      </Link>
    </p>
  );
}
