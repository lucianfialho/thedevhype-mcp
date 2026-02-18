import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - TheDevHype',
};

export default function TermsPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Last updated: February 17, 2026
      </p>

      <section className="mt-10 space-y-8 text-zinc-700 dark:text-zinc-300">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            1. Acceptance of Terms
          </h2>
          <p className="mt-2 leading-relaxed">
            By accessing and using TheDevHype (&quot;the Service&quot;), you
            agree to be bound by these Terms of Service. If you do not agree, do
            not use the Service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            2. Description of Service
          </h2>
          <p className="mt-2 leading-relaxed">
            TheDevHype provides MCP (Model Context Protocol) servers that
            integrate with AI assistants like Claude, Cursor, and other
            compatible clients. Our current MCP servers include:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>Eloa</strong> — AI content curation with RSS feeds,
              bookmarks, and search
            </li>
            <li>
              <strong>Lucian</strong> — Virtual grocery manager with receipt
              scanning, price tracking, and spending analysis (Brazil only)
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            3. Account and API Keys
          </h2>
          <p className="mt-2 leading-relaxed">
            You must sign in with a valid GitHub account to use the Service. You
            are responsible for keeping your API keys secure. Do not share your
            API keys publicly. You can regenerate or revoke keys at any time
            from your dashboard.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            4. Acceptable Use
          </h2>
          <p className="mt-2 leading-relaxed">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to bypass rate limits or abuse the API</li>
            <li>Share your API keys with unauthorized users</li>
            <li>Reverse-engineer or attempt to extract the source code</li>
            <li>Use automated tools to scrape or overload the Service</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            5. Rate Limits
          </h2>
          <p className="mt-2 leading-relaxed">
            API usage is subject to rate limits. Exceeding these limits may
            result in temporary or permanent suspension of your API access.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            6. Data and Privacy
          </h2>
          <p className="mt-2 leading-relaxed">
            Your use of the Service is also governed by our{' '}
            <a
              href="/privacy"
              className="text-zinc-900 underline dark:text-zinc-100"
            >
              Privacy Policy
            </a>
            . By using the Service, you consent to the collection and use of
            data as described therein.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            7. Availability
          </h2>
          <p className="mt-2 leading-relaxed">
            We strive to maintain high availability but do not guarantee
            uninterrupted access. The Service is provided &quot;as is&quot;
            without warranties of any kind.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            8. Limitation of Liability
          </h2>
          <p className="mt-2 leading-relaxed">
            TheDevHype shall not be liable for any indirect, incidental, or
            consequential damages arising from your use of the Service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            9. Changes to Terms
          </h2>
          <p className="mt-2 leading-relaxed">
            We reserve the right to modify these terms at any time. Continued
            use of the Service after changes constitutes acceptance of the new
            terms.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            10. Contact
          </h2>
          <p className="mt-2 leading-relaxed">
            For questions about these terms, contact us at{' '}
            <a
              href="mailto:hello@thedevhype.com"
              className="text-zinc-900 underline dark:text-zinc-100"
            >
              hello@thedevhype.com
            </a>
            .
          </p>
        </div>
      </section>
    </article>
  );
}
