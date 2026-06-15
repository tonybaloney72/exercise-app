import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_APP_NAME } from "@/data/legal";

export const metadata: Metadata = {
  title: "Android app | MyExercise",
  description: `Install the native ${LEGAL_APP_NAME} Android app.`,
};

export default function AndroidDownloadPage() {
  const configuredApkUrl =
    process.env.NEXT_PUBLIC_ANDROID_APP_DOWNLOAD_URL?.trim() ?? null;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-12">
        <p className="mb-6">
          <Link
            href="/settings"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            ← Back to Settings
          </Link>
        </p>

        <header className="mb-8 space-y-2 border-b border-border pb-6">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Android app
          </h1>
          <p className="text-sm text-muted">
            Native install for launcher icon, splash screen, and pull-to-refresh.
          </p>
        </header>

        <div className="space-y-6 text-sm leading-relaxed text-muted">
          {configuredApkUrl ? (
            <section className="space-y-3">
              <p className="text-foreground">
                A release APK is available for download.
              </p>
              <a
                href={configuredApkUrl}
                className="inline-flex rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
              >
                Download APK
              </a>
              <p>
                After downloading, open the file on your Android device. You may
                need to allow installs from your browser once.
              </p>
            </section>
          ) : (
            <section className="space-y-3">
              <p className="text-foreground">
                A public APK download is not hosted yet.
              </p>
              <p>
                The Settings link points here so you can verify the flow before
                a release file is published. When ready, set{" "}
                <code className="rounded bg-surface-hover px-1.5 py-0.5 text-xs text-foreground">
                  NEXT_PUBLIC_ANDROID_APP_DOWNLOAD_URL
                </code>{" "}
                to the APK URL (or place a file and point the env var at it).
              </p>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Build locally (developers)
            </h2>
            <p>
              To run the native shell against production while developing
              Capacitor:
            </p>
            <pre className="overflow-x-auto rounded-xl border border-border bg-surface-hover p-4 text-xs text-foreground">
              {`npm run android:remote:run`}
            </pre>
            <p>
              For local UI changes, keep{" "}
              <code className="rounded bg-surface-hover px-1.5 py-0.5 text-xs text-foreground">
                npm run dev
              </code>{" "}
              running and use{" "}
              <code className="rounded bg-surface-hover px-1.5 py-0.5 text-xs text-foreground">
                npm run android:dev
              </code>
              . See{" "}
              <code className="rounded bg-surface-hover px-1.5 py-0.5 text-xs text-foreground">
                docs/capacitor-android.md
              </code>{" "}
              in the repo.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
