import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Service — AllureTV',
  description:
    'Terms governing your use of AllureTV — a sensual romance streaming service for adults.',
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LegalLayout title="Terms of Service" lastUpdated="May 6, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) form a binding agreement
        between you and AllureTV, governing your access to and use of the
        website <strong>alluretv.net</strong>, the AllureTV mobile progressive
        web app, and any related services (collectively, the
        &quot;Service&quot;).
      </p>

      <p>
        By creating an account or otherwise using the Service you agree to
        these Terms and our{' '}
        <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use
        the Service.
      </p>

      <div className="callout">
        <p>
          <strong>Adults only.</strong> The Service contains sensual romantic
          content intended for users aged <strong>18 or older</strong>. By
          accessing the Service you certify that you are of legal age in your
          jurisdiction.
        </p>
      </div>

      <h2>1. Your account</h2>
      <p>
        You may create an account using a Google account or by requesting a
        magic-link sign-in to your email address. You are responsible for the
        activity that happens under your account, including keeping your email
        inbox secure. Notify us immediately at the address in section 12 if
        you suspect unauthorized access.
      </p>
      <p>
        We may suspend or terminate accounts that violate these Terms,
        repeatedly post abusive content, or are linked to fraud or chargebacks.
      </p>

      <h2>2. License to use the Service</h2>
      <p>
        Subject to your compliance with these Terms, we grant you a personal,
        limited, non-exclusive, non-transferable, revocable license to access
        and stream the audio, video, and text content available on the
        Service for your own private, non-commercial enjoyment.
      </p>
      <p>You may not:</p>
      <ul>
        <li>
          Download, copy, screen-record, redistribute, publicly perform, or
          create derivative works from any part of the content unless we
          expressly say so.
        </li>
        <li>
          Share your account credentials, sign-in link, or session with anyone
          else.
        </li>
        <li>
          Use bots, scrapers, or any automated means to access, store, or
          duplicate the content.
        </li>
        <li>
          Bypass, disable, or interfere with the security and rate-limiting
          features of the Service.
        </li>
      </ul>

      <h2>3. Subscriptions and payments</h2>
      <p>
        Some content may require an active paid subscription. When subscriptions
        are enabled:
      </p>
      <ul>
        <li>
          Payments are processed by <strong>Stripe, Inc.</strong> Subject to
          their terms and privacy policy.
        </li>
        <li>
          Subscriptions renew automatically at the end of each billing cycle
          using the payment method on file. You can cancel at any time from
          your account page; access continues until the end of the current
          paid period.
        </li>
        <li>
          Prices may change. We will notify you by email at least 30 days
          before any change takes effect.
        </li>
        <li>
          Except where required by law (for example, in jurisdictions with
          mandatory cooling-off periods), payments are non-refundable once a
          billing cycle has begun.
        </li>
      </ul>

      <h2>4. User content</h2>
      <p>
        The Service lets you post comments, replies, ratings, and reactions
        (&quot;User Content&quot;). You retain ownership of what you write, but
        you grant AllureTV a worldwide, royalty-free, non-exclusive license to
        host, display, and moderate that content as part of operating the
        Service.
      </p>
      <p>
        You agree not to post content that:
      </p>
      <ul>
        <li>Is unlawful, defamatory, harassing, or threatening.</li>
        <li>Infringes anyone&apos;s intellectual property or privacy rights.</li>
        <li>
          Promotes, depicts, or sexualizes minors in any way. We will report
          such content to the appropriate authorities and ban the account
          permanently.
        </li>
        <li>Contains malware, spam, or commercial solicitations.</li>
        <li>
          Reveals personal identifying information of other users without
          consent.
        </li>
      </ul>
      <p>
        We may remove any User Content at our discretion and without notice.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        All AllureTV content — including stories, audiobooks, ebooks, narration,
        cover artwork, original characters, the AllureTV name, and the rose +
        gold visual identity — is the property of AllureTV or its licensors and
        is protected by copyright and trademark laws. Nothing in these Terms
        transfers ownership to you.
      </p>

      <h2>6. DMCA / copyright complaints</h2>
      <p>
        If you believe content on the Service infringes your copyright, send a
        notice to the address in section 12 with: (a) identification of the
        work; (b) the URL where the infringing material appears; (c) your
        contact information; (d) a statement that you have a good-faith belief
        the use is unauthorized; (e) a statement under penalty of perjury that
        the information is accurate and you are authorized to act for the
        rights holder; and (f) your physical or electronic signature.
      </p>

      <h2>7. Service availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted access.
        We may suspend, modify, or discontinue any feature at any time, with or
        without notice. Scheduled maintenance and emergency fixes are part of
        normal operation.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided <strong>&quot;as is&quot;</strong> and{' '}
        <strong>&quot;as available&quot;</strong>. To the fullest extent
        permitted by law, AllureTV disclaims all warranties, express or
        implied, including merchantability, fitness for a particular purpose,
        non-infringement, and any warranty arising from course of dealing or
        usage.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, AllureTV and its operators will
        not be liable for indirect, incidental, special, consequential, or
        punitive damages, or for any loss of profits, revenue, data, or
        goodwill arising out of or related to the Service. Our total liability
        for any claim is capped at the amount you paid us in the 12 months
        preceding the event.
      </p>
      <p>
        Some jurisdictions do not allow the exclusion or limitation of certain
        damages. In those places, the limits in this section apply only to the
        extent allowed by law.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may stop using the Service at any time and delete your account
        from your account page. We may suspend or terminate your access if
        you breach these Terms, if required by law, or if continuing to provide
        the Service to you becomes commercially impractical. Sections that by
        their nature should survive termination (intellectual property,
        disclaimers, liability limits, governing law) survive.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction where AllureTV
        is established, without regard to conflict-of-laws rules. Any dispute
        will first be attempted to be resolved informally by contacting us at
        the address below; unresolved disputes will be submitted to the courts
        of that jurisdiction.
      </p>

      <h2>12. Contact</h2>
      <div className="callout">
        <p>
          For questions about these Terms or to send legal notices, email us
          at:
          <br />
          <a href="mailto:rededecanaisanonimo@gmail.com">
            rededecanaisanonimo@gmail.com
          </a>
        </p>
      </div>

      <p className="text-xs text-text-mute mt-10">
        These Terms constitute the entire agreement between you and AllureTV
        regarding the Service. If any provision is held to be unenforceable,
        the remaining provisions remain in full effect.
      </p>
    </LegalLayout>
  );
}
