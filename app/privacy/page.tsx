import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Stacksmith",
  description: "How Stacksmith handles your data.",
};

export default function PrivacyPage() {
  return (
    <main className="wrap legal">
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated: August 29, 2026</p>

      <p>
        Stacksmith is a tool that turns a one-sentence app idea into an architecture plan
        for the Stripe Projects CLI. This policy describes what data we collect and how it
        is used.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your app idea.</strong> The text you submit is sent to an AI model via
          OpenRouter to generate a plan. It is processed by the selected model provider
          under their terms and is not used by us for anything else.
        </li>
        <li>
          <strong>Your email address</strong>, only if you choose to log in. We use it
          solely to send you a magic login link and to identify your account. Auth is
          handled by Supabase.
        </li>
        <li>
          <strong>Saved plans.</strong> If you are logged in and click save, the idea and
          the generated plan are stored in our database (Supabase), linked to your
          account. Only you can read or delete them; access is enforced with row-level
          security.
        </li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>No selling or sharing of your data with third parties for marketing.</li>
        <li>No advertising, no tracking cookies, no analytics profiles.</li>
        <li>No storage of anonymous generations; plans are only stored when you save them.</li>
      </ul>

      <h2>Share links</h2>
      <p>
        The &quot;Copy share link&quot; feature encodes your idea and plan directly into
        the URL. Anyone you give that link to can read its contents. Nothing is stored on
        our servers for shared links.
      </p>

      <h2>Service providers</h2>
      <p>
        We rely on Supabase (auth and database), OpenRouter (AI generation), and Vercel
        (hosting). Each processes data as needed to provide their service, under their own
        privacy policies.
      </p>

      <h2>Deleting your data</h2>
      <p>
        You can delete any saved plan from your history at any time. To delete your
        account and all associated data, contact us at the address below.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: open an issue at{" "}
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
