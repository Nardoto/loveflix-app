import { EMAIL_COPY, interpolate } from '../copy';
import type { PaymentFailedEmailProps } from '../types';
import { CTAButton, EmailLayout, H1, P } from './_layout';

export default function PaymentFailedEmail({
  firstName,
  locale,
  amount,
  currency,
  manageUrl,
  billingUrl,
}: PaymentFailedEmailProps) {
  const c = EMAIL_COPY[locale].payment_failed;
  const heading = interpolate(c.heading, { firstName });
  const detail = interpolate(c.detail, { amount, currency });

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
      <P dim>{c.reasons}</P>
      <CTAButton href={billingUrl}>{c.cta} →</CTAButton>
      <P dim>{c.outro}</P>
    </EmailLayout>
  );
}

PaymentFailedEmail.PreviewProps = {
  firstName: 'Lucas',
  locale: 'pt',
  amount: 'R$79,90',
  currency: 'BRL',
  manageUrl: 'https://alluretv.net/account',
  billingUrl: 'https://alluretv.net/account/billing',
  homeUrl: 'https://alluretv.net/',
} satisfies PaymentFailedEmailProps;
