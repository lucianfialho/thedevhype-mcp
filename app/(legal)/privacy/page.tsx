import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - TheDevHype',
};

export default function PrivacyPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Last updated: February 17, 2026
      </p>

      <section className="mt-10 space-y-8 text-zinc-700 dark:text-zinc-300">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            1. Information We Collect
          </h2>
          <p className="mt-2 leading-relaxed">
            When you sign in with GitHub, we collect your name, email address,
            and GitHub profile information. We also collect usage data related to
            MCP server interactions to provide and improve our services.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            2. How We Use Your Information
          </h2>
          <p className="mt-2 leading-relaxed">
            We use the information we collect to:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Provide and maintain our MCP server services</li>
            <li>Authenticate your identity and manage your account</li>
            <li>Track API usage and enforce rate limits</li>
            <li>Improve and optimize our services</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            3. Data Storage
          </h2>
          <p className="mt-2 leading-relaxed">
            Your data is stored securely using Neon PostgreSQL. API keys are
            generated per user and can be regenerated at any time. We do not sell
            your personal information to third parties.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            4. Third-Party Services
          </h2>
          <p className="mt-2 leading-relaxed">
            We use the following third-party services:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>GitHub</strong> — for authentication
            </li>
            <li>
              <strong>Neon</strong> — for database hosting
            </li>
            <li>
              <strong>Vercel</strong> — for application hosting
            </li>
            <li>
              <strong>Serper</strong> — for shopping price comparisons (Lucian
              MCP)
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            5. Your Rights
          </h2>
          <p className="mt-2 leading-relaxed">
            You can request deletion of your account and associated data at any
            time by contacting us. You can regenerate or revoke your API keys
            through your dashboard settings.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            6. Cookies
          </h2>
          <p className="mt-2 leading-relaxed">
            We use essential cookies for authentication and session management.
            We do not use tracking or advertising cookies.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            7. Changes to This Policy
          </h2>
          <p className="mt-2 leading-relaxed">
            We may update this policy from time to time. We will notify users of
            significant changes through the application.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            8. Contact
          </h2>
          <p className="mt-2 leading-relaxed">
            If you have questions about this privacy policy, contact us at{' '}
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
