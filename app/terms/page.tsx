import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service · Stacksmith",
  description: "Terms for using Stacksmith.",
};

export default function TermsPage() {
  return (
    <main className="wrap legal">
      <h1>Terms of Service</h1>
      <p className="updated">Last updated: August 29, 2026</p>

      <p>
        By using Stacksmith you agree to these terms. If you do not agree, do not use the
        service.
      </p>

      <h2>The service</h2>
      <p>
        Stacksmith generates architecture suggestions for the Stripe Projects CLI from a
        text description. Output is produced by AI models and may be incomplete,
        outdated, or wrong. Review every recommendation and command before running it;
        you are responsible for anything you execute and for any costs incurred with the
        providers a plan recommends.
      </p>

      <h2>Your account and content</h2>
      <ul>
        <li>Logging in is optional and uses a magic email link; keep access to your inbox secure.</li>
        <li>You retain ownership of the ideas you submit and the plans you save.</li>
        <li>You may not use the service to generate content that is unlawful or to probe, disrupt, or overload the service.</li>
      </ul>

      <h2>No affiliation</h2>
      <p>
        Stacksmith is an independent community project built for the Build with Stripe
        Community hackathon. It is not affiliated with, endorsed by, or operated by
        Stripe, Supabase, OpenRouter, Vercel, or any provider it recommends.
      </p>

      <h2>Disclaimer and liability</h2>
      <p>
        The service is provided &quot;as is&quot;, without warranties of any kind. To the
        maximum extent permitted by law, we are not liable for any damages arising from
        your use of the service or from acting on generated plans.
      </p>

      <h2>Changes and termination</h2>
      <p>
        We may change or discontinue the service, or update these terms, at any time.
        Continued use after a change means you accept the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: open an issue at{" "}
        <a href="https://github.com/sumonmselim/stacksmith" target="_blank" rel="noreferrer">
          github.com/sumonmselim/stacksmith
        </a>
        .
      </p>

      <p>
        <Link href="/">← Back to Stacksmith</Link>
      </p>
    </main>
  );
}
