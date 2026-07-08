import type { Metadata } from "next";
import LegalDocumentLayout from "@/components/legal/LegalDocumentLayout";
import {
  LEGAL_APP_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_DOMAIN,
  LEGAL_OPERATOR,
} from "@/data/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | MyExercise",
  description: `Privacy policy for ${LEGAL_APP_NAME} (${LEGAL_DOMAIN}).`,
};

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout title="Privacy Policy">
      <section className="flex flex-col gap-3">
        <p>
          {LEGAL_APP_NAME} ({LEGAL_DOMAIN}) is a personal fitness app built and
          operated by {LEGAL_OPERATOR} as a solo developer project. This policy
          explains what information the app uses and how it is handled.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          What we collect
        </h2>
        <p>
          We keep data collection to a minimum. We do <strong>not</strong> sell
          your information, run advertising trackers, or build marketing
          profiles.
        </p>
        <ul className="flex flex-col list-disc gap-2 pl-5 text-muted">
          <li>
            <strong className="text-foreground">Account email</strong> - used
            only to sign you in and identify your account. If you use Google
            sign-in, Google may share your email (and basic profile details such
            as your name or avatar) with us solely for authentication.
          </li>
          <li>
            <strong className="text-foreground">
              Workout and settings you save
            </strong>{" "}
            - if you create an account, exercises, logs, and preferences you
            enter in the app are stored so the service can sync across your
            devices. This is app data you choose to save, not data we harvest
            for resale or advertising.
          </li>
          <li>
            <strong className="text-foreground">
              Optional exercise reports
            </strong>{" "}
            - if you submit a catalog issue report, we store what you send
            (issue type and any note) so it can be reviewed and fixed.
          </li>
          <li>
            <strong className="text-foreground">Guest mode</strong> - if you
            continue without an account, your data stays on your device in local
            storage. We do not receive it unless you later sign up and migrate
            it.
          </li>
          <li>
            <strong className="text-foreground">
              Health &amp; fitness data (optional)
            </strong>{" "}
            - if you connect{" "}
            <a
              href="https://health.google/health-connect-android/"
              className="text-accent hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              Health Connect
            </a>{" "}
            on Android, you choose which types to share (for example steps,
            distance, calories, heart rate, sleep, exercise sessions, routes,
            weight, or VO₂ max). We read this data to show Progress and Health
            charts, enrich cardio sessions, and import activities you select.
            When you log or complete workouts in the app, we may write exercise
            sessions, distance, calories, or weight back to Health Connect if
            you allow it. Health Connect data is sensitive; we do not sell it or
            use it for advertising.
          </li>
          <li>
            <strong className="text-foreground">
              Location &amp; GPS routes (optional)
            </strong>{" "}
            - if you record a GPS cardio activity in the Android app, the app
            collects location points while recording to calculate distance and
            show your route on a map. Route points may be stored with your
            workout log and synced to your account if you are signed in. Routes
            may also come from Health Connect when you import a session that
            includes one.
          </li>
          <li>
            <strong className="text-foreground">
              Local notifications (optional)
            </strong>{" "}
            - on Android, the app can schedule local notifications when a rest
            or set timer finishes in the background. These are generated on your
            device only; we do not operate a push-notification or marketing
            notification service.
          </li>
          <li>
            <strong className="text-foreground">Diagnostic logs (optional)</strong>{" "}
            - if you unlock and export the diagnostic log in Settings, the app
            can include recent technical events (for example saves, Health
            Connect, or GPS flows) in text you copy or share. This log stays on
            your device unless you choose to send it.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          How we use information
        </h2>
        <p>Information is used only to operate {LEGAL_APP_NAME}:</p>
        <ul className="flex flex-col list-disc gap-2 pl-5 text-muted">
          <li>Authenticate you and keep you signed in</li>
          <li>Save and sync workouts and settings you choose to store</li>
          <li>
            Display health and activity metrics you connect through Health
            Connect
          </li>
          <li>Record and display GPS routes for cardio activities you choose</li>
          <li>Deliver local timer alerts you enable on your device</li>
          <li>Respond to exercise content reports you voluntarily submit</li>
          <li>Keep the app secure and working reliably</li>
        </ul>
        <p>We do not use your data for targeted advertising.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Where data is stored
        </h2>
        <p>
          Signed-in account and workout data is stored with{" "}
          <a
            href="https://supabase.com"
            className="text-accent hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Supabase
          </a>{" "}
          (hosted database with row-level security). This includes workout logs,
          settings, and optional fields such as health metrics attached to
          sessions and GPS route points when you record or import them. The
          website is hosted on{" "}
          <a
            href="https://vercel.com"
            className="text-accent hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Vercel
          </a>
          . Exercise reports may be emailed to the developer for review via a
          transactional email provider; those messages are not used for
          marketing.
        </p>
        <p>
          Health Connect data is read from and written to Google&apos;s Health
          Connect on your device according to the permissions you grant there.
          Map views in the app load map tiles from third-party providers (see
          below); your account servers do not receive your GPS coordinates for
          map rendering.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Health Connect (Android)
        </h2>
        <p>
          Health Connect is optional. You can connect, change, or revoke access
          anytime in{" "}
          <strong className="text-foreground">
            Settings → Device &amp; timers → Permissions &amp; connections
          </strong>{" "}
          or in the Health Connect app. If you delete your {LEGAL_APP_NAME}{" "}
          account, synced workout and health-related fields stored in our
          database are removed as described below; data already written to
          Health Connect remains under your control in Health Connect unless you
          remove it there.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Maps and location display
        </h2>
        <p>
          When you view a GPS route, the app loads map images (tiles) from{" "}
          <a
            href="https://openfreemap.org/"
            className="text-accent hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            OpenFreeMap
          </a>{" "}
          and data from{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            className="text-accent hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            OpenStreetMap
          </a>{" "}
          contributors. Your device requests tiles for the map area you are
          viewing; we do not send your stored route to our servers for map
          display.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Google sign-in
        </h2>
        <p>
          If you sign in with Google, Google&apos;s OAuth service handles
          authentication. We receive only what is needed to create and maintain
          your account (typically your email and basic profile information). Our
          use of information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-accent hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We do not use Google user
          data for advertising or sell it to third parties.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Sharing with third parties
        </h2>
        <p>
          We do not sell or rent your personal information. Data is shared only
          with infrastructure providers that help run the app (hosting,
          authentication, and database services) under their own privacy terms,
          and only as needed to provide the service. Map tile requests go
          directly from your device to map providers when you view a route.
          Health Connect is operated by Google on your device when you choose to
          use it.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Your choices and controls
        </h2>
        <ul className="flex flex-col list-disc gap-2 pl-5 text-muted">
          <li>
            Connect or disconnect Health Connect and adjust its permissions in
            Android settings
          </li>
          <li>
            Allow or deny location and notifications for {LEGAL_APP_NAME} in
            Android app settings
          </li>
          <li>
            Use guest mode to keep data local until you choose to create an
            account
          </li>
          <li>Delete your account to remove synced data from our servers</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Retention and deletion
        </h2>
        <p>
          Account and workout data is kept while your account is active so the
          app can function. You can delete your account anytime from{" "}
          <strong className="text-foreground">Settings → Account</strong>, which
          removes your synced data from our servers. You may also email us to
          request deletion. Guest data on your device can be cleared by removing
          the app or site data from your browser.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Contact</h2>
        <p>
          Questions about this policy or your data? Email{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-accent hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Changes</h2>
        <p>
          This policy may be updated as the app evolves. The &quot;Last
          updated&quot; date at the top will change when it does. Continued use
          of {LEGAL_APP_NAME} after changes means you accept the revised policy.
        </p>
      </section>
    </LegalDocumentLayout>
  );
}
