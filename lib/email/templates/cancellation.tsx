import { EMAIL_COPY, interpolate } from '../copy';
import type { CancellationEmailProps } from '../types';
import { CTAButton, EmailLayout, H1, P } from './_layout';

export default function CancellationEmail({
  firstName,
  locale,
  accessUntil,
  manageUrl,
  reactivateUrl,
}: CancellationEmailProps) {
  const c = EMAIL_COPY[locale].cancellation;
  const heading = interpolate(c.heading, { firstName });
  const detail = interpolate(c.detail, { accessUntil });

  return (
    <EmailLayout
      preview={c.preheader}
      manageUrl={manageUrl}
      manageLabel={c.footerManage}
      legalLine={c.footerLegal}
    >
      <H1>{heading}</H1>
      <P>{c.intro}</P>
      <P>{detail}</P>
      <CTAButton href={reactivateUrl}>{c.reactivateCta} →</CTAButton>
      <P dim>{c.outro}</P>
    </EmailLayout>
  );
}

CancellationEmail.PreviewProps = {
  firstName: 'Lucas',
  locale: 'pt',
  accessUntil: '15 de junho de 2026',
  manageUrl: 'https://alluretv.net/account',
  reactivateUrl: 'https://alluretv.net/subscribe',
  homeUrl: 'https://alluretv.net/',
} satisfies CancellationEmailProps;
