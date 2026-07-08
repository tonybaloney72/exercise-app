import type { Metadata } from "next";
import LegalDocumentLayout from "@/components/legal/LegalDocumentLayout";
import {
  LEGAL_APP_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_DOMAIN,
  LEGAL_OPERATOR,
} from "@/data/legal";

export const metadata: Metadata = {
  title: "Terms of Service | MyExercise",
  description: `Terms of service for ${LEGAL_APP_NAME} (${LEGAL_DOMAIN}).`,
};

export default function TermsPage() {
  return (
    <LegalDocumentLayout title="Terms of Service">
      <section className="flex flex-col gap-3">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of{" "}
          {LEGAL_APP_NAME} at {LEGAL_DOMAIN}, a personal project built and
          operated by {LEGAL_OPERATOR}. By using the app, you agree to these
          Terms.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Solo developer project
        </h2>
        <p>
          {LEGAL_APP_NAME} is maintained by a single developer, not a large
          company. Features may change, break, or be discontinued. The app is
          provided in good faith to help you plan and log workouts.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Not medical advice
        </h2>
        <p>
          {LEGAL_APP_NAME} is a fitness planning and logging tool only. It does
          not provide medical, physical therapy, or professional coaching advice.
          Data from Health Connect, GPS, or your device may be incomplete or
          inaccurate. Consult a qualified professional before starting or
          changing an exercise program, especially if you have health conditions,
          injuries, or other risk factors. You are responsible for exercising
          safely and within your limits, including when recording routes
          outdoors.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Third-party services
        </h2>
        <p>
          Some features rely on services outside {LEGAL_APP_NAME}, including
          Health Connect (Google), map tile providers, and sign-in providers.
          Those services have their own terms and availability. We do not
          guarantee that Health Connect, GPS, notifications, or map views will
          work on every device or OS version.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Your account</h2>
        <p>
          You may use guest mode without an account or create an account to sync
          data. You are responsible for keeping your login credentials secure and
          for activity under your account. Do not misuse the service (for example,
          by attempting to disrupt it, access others&apos; data, or abuse
          reporting features).
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Your content and data
        </h2>
        <p>
          Workout logs, settings, health metrics, and GPS routes you enter or
          connect belong to you. We store them only to provide the service, as
          described in our{" "}
          <a href="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </a>
          . We do not sell your data.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Availability and changes
        </h2>
        <p>
          The app is offered &quot;as is&quot; and &quot;as available.&quot; We
          do not guarantee uninterrupted access, error-free operation, or that
          generated workout plans will meet every goal or preference. Features may
          be added, changed, or removed at any time.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Limitation of liability
        </h2>
        <p>
          To the fullest extent permitted by law, {LEGAL_OPERATOR} is not liable
          for any injury, loss, or damages arising from your use of {LEGAL_APP_NAME},
          including reliance on suggested exercises, timers, plans, Health
          Connect metrics, GPS routes, or map displays. Use the app at your own
          risk.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Termination</h2>
        <p>
          You may stop using the app at any time. We may suspend or terminate
          access if these Terms are violated or if necessary to protect the
          service or other users.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Contact</h2>
        <p>
          Questions about these Terms? Email{" "}
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
          These Terms may be updated from time to time. The &quot;Last
          updated&quot; date at the top will change when they do. Continued use
          of {LEGAL_APP_NAME} after changes means you accept the revised Terms.
        </p>
      </section>
    </LegalDocumentLayout>
  );
}
