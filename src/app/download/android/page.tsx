import type { Metadata } from "next";
import Link from "next/link";
import FatSecretAttributionSnippet from "@/components/nutrition/FatSecretAttributionSnippet";
import { LEGAL_APP_NAME } from "@/data/legal";
import {
  resolveAndroidAppDownloadAbsoluteUrl,
} from "@/lib/androidAppDownload";

export const metadata: Metadata = {
  title: "Android app | MyExercise",
  description: `Install the native ${LEGAL_APP_NAME} Android app.`,
};

export default function AndroidDownloadPage() {
  const downloadUrl = resolveAndroidAppDownloadAbsoluteUrl();

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-12">
        <p className="mb-6">
          <Link
            href="/"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            ← Back to home
          </Link>
        </p>

        <header className="flex flex-col mb-8 gap-2 border-b border-border pb-6">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Android app
          </h1>
          <p className="text-sm text-muted">
            Native install for launcher icon, splash screen, and pull-to-refresh.
          </p>
        </header>

        <div className="flex flex-col gap-6 text-sm leading-relaxed text-muted">
          <section className="flex flex-col gap-3">
            <p className="text-foreground">
              Download the MyExercise Android app (APK) and install it on your
              device.
            </p>
            <a
              href={downloadUrl}
              download="myexercise.apk"
              className="inline-flex rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              Download APK
            </a>
            <p>
              Direct link:{" "}
              <a
                href={downloadUrl}
                className="text-accent hover:underline"
              >
                {downloadUrl}
              </a>
            </p>
            <p>
              After downloading, open the file on your Android device. You may
              need to allow installs from your browser once. The app loads{" "}
              <strong className="text-foreground">myexercise.dev</strong> in a
              native shell and needs internet.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              Build a new APK (developers)
            </h2>
            <p>From the repo root:</p>
            <pre className="overflow-x-auto rounded-xl border border-border bg-surface-hover p-4 text-xs text-foreground">
              {`npm run android:apk`}
            </pre>
            <p>
              That syncs remote mode, runs Gradle, and copies the APK to{" "}
              <code className="rounded bg-surface-hover px-1.5 py-0.5 text-xs text-foreground">
                public/downloads/myexercise.apk
              </code>
              . Commit and deploy so production serves the new file.
            </p>
          </section>
        </div>

        <footer className="mt-10 border-t border-border pt-6">
          <FatSecretAttributionSnippet className="text-sm [&_a]:text-muted [&_a]:transition-colors [&_a]:hover:text-foreground" />
        </footer>
      </div>
    </main>
  );
}
