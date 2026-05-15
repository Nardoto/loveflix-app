import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy — AllureTV',
  description:
    'How AllureTV collects, uses, and protects your personal information.',
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 14, 2026">
      <p>
        AllureTV (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the
        website <strong>alluretv.net</strong> and its associated mobile
        progressive web app. This Privacy Policy explains what personal data we
        collect, how we use it, and the rights you have over it.
      </p>

      <p>
        AllureTV is intended for adults aged 18 or older. By using the service
        you confirm you are of legal age in your jurisdiction.
      </p>

      <h2>1. Information we collect</h2>

      <h3>1.1 Account information</h3>
      <p>
        When you sign in we collect the information your authentication
        provider shares with us:
      </p>
      <ul>
        <li>
          <strong>Google sign-in:</strong> email address, full name, profile
          picture URL, and a Google account identifier.
        </li>
        <li>
          <strong>Email magic link:</strong> the email address you provide.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> store passwords. Authentication is delegated
        to Supabase Auth and your chosen provider (Google).
      </p>

      <h3>1.2 Activity data</h3>
      <ul>
        <li>
          Comments, ratings and replies you post on stories, with your display
          name and avatar.
        </li>
        <li>
          Likes you give to other comments and items you save to &quot;My
          List&quot;.
        </li>
        <li>
          Anonymous, aggregated playback analytics (which stories were played,
          completion rate). We do not record audio or video of you.
        </li>
      </ul>

      <h3>1.3 Payment information</h3>
      <p>
        When subscriptions are enabled, payments are processed by{' '}
        <strong>Stripe, Inc.</strong> AllureTV does not see, store, or have
        access to your full card number. We retain only the subscription status
        (active / canceled / trialing), the renewal date, and a Stripe customer
        identifier.
      </p>

      <h3>1.4 Technical data</h3>
      <ul>
        <li>
          IP address, browser user-agent, device type and language, used for
          security, fraud prevention, and to choose the right audio/text
          locale.
        </li>
        <li>
          Cookies strictly necessary for the session: a Supabase auth cookie
          (so you stay signed in) and a locale preference cookie (so the site
          remembers if you chose English / Deutsch / Français / Español).
        </li>
      </ul>

      <h3>1.5 Age verification data</h3>
      <p>
        Because AllureTV is intended for adults, we collect and retain:
      </p>
      <ul>
        <li>
          Your date of birth (required to confirm you are 18 or older).
        </li>
        <li>
          The timestamp at which you accepted these Terms and the version of
          the Terms you accepted.
        </li>
        <li>
          The country code derived from your IP address at the time of
          verification (used for compliance with local age-assurance laws).
        </li>
        <li>
          A hashed audit log entry (hashed IP and user-agent — never raw —
          plus the verification result) kept for compliance and fraud
          prevention.
        </li>
      </ul>
      <p>
        Legal basis: compliance with our legal obligation to restrict adult
        content to adults (GDPR Art. 6(1)(c); LGPD Art. 7º, II). Age
        verification is valid for two years, after which you will be asked to
        re-verify.
      </p>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To create and authenticate your account.</li>
        <li>
          To provide the stories, audiobooks, ebooks, and player features.
        </li>
        <li>To process subscription payments via Stripe.</li>
        <li>
          To display your comments, ratings, and likes alongside other users&apos;
          activity.
        </li>
        <li>
          To send transactional emails about your account (sign-in links,
          billing receipts, important service changes). We do not send
          marketing emails unless you explicitly opt in.
        </li>
        <li>
          To detect, investigate, and prevent fraud, abuse, and security
          incidents.
        </li>
      </ul>

      <h2>3. Service providers</h2>
      <p>
        We work with the following data processors. Each has its own privacy
        policy.
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> (PostgreSQL hosting + Auth).
        </li>
        <li>
          <strong>Cloudflare</strong> (DNS, R2 object storage for media
          delivery, edge caching).
        </li>
        <li>
          <strong>Vercel</strong> (web application hosting).
        </li>
        <li>
          <strong>Google</strong> (when you sign in with a Google account).
        </li>
        <li>
          <strong>Stripe</strong> (payment processing — only active when
          subscriptions are enabled).
        </li>
        <li>
          <strong>PostHog</strong> (privacy-respecting product analytics).
        </li>
      </ul>

      <h2>4. Data retention</h2>
      <p>
        We keep your account information while your account is active and for
        up to 90 days after deletion to comply with legal and accounting
        obligations. Aggregated analytics may be retained longer in a form
        that no longer identifies you personally.
      </p>

      <h2>5. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to:
      </p>
      <ul>
        <li>Access a copy of the personal data we hold about you.</li>
        <li>Correct inaccurate or incomplete data.</li>
        <li>
          Delete your account and associated data (right to erasure /
          &quot;right to be forgotten&quot; under GDPR; right to delete under
          CCPA).
        </li>
        <li>Export your data in a portable format.</li>
        <li>Withdraw consent for any processing based on consent.</li>
        <li>
          Object to processing or request restriction of processing in certain
          cases.
        </li>
      </ul>
      <p>
        To exercise any of these rights, email us at the address below. We
        respond within 30 days.
      </p>

      <h2>6. International transfers</h2>
      <p>
        Your data may be processed in the United States and the European
        Union. When data leaves your jurisdiction, we rely on the standard
        contractual clauses provided by the relevant data protection
        authorities.
      </p>

      <h2>7. Children</h2>
      <p>
        AllureTV is not intended for anyone under 18. We do not knowingly
        collect data from minors. If you believe a minor has created an
        account, contact us and we will delete it promptly.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The
        &quot;last updated&quot; date at the top reflects the most recent
        revision. Material changes will be announced by email and on the site
        before they take effect.
      </p>

      <h2>9. Contact</h2>
      <div className="callout">
        <p>
          For privacy questions, data requests, or concerns, contact us at:
          <br />
          <a href="mailto:rededecanaisanonimo@gmail.com">
            rededecanaisanonimo@gmail.com
          </a>
        </p>
      </div>
    </LegalLayout>
  );
}
