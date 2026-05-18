import { EMAIL_COPY, interpolate } from '../copy';
import type { RenewalEmailProps } from '../types';
import {
  CTAButton,
  EmailLayout,
  H1,
  P,
  Perk,
  PerksTitle,
} from './_layout';

export default function RenewalEmail({
  firstName,
  locale,
  amount,
  currency,
  nextBillingDate,
  manageUrl,
  libraryUrl,
}: RenewalEmailProps) {
  const c = EMAIL_COPY[locale].renewal;
  const heading = interpolate(c.heading, { firstName });
  const body = interpolate(c.body, { amount, currency, nextBillingDate });

  return (
    <EmailLayout
      preview={c.preheader}
      manageUrl={manageUrl}
      manageLabel={c.footerManage}
      legalLine={c.footerLegal}
    >
      <H1>{heading}</H1>
      <P>{body}</P>
      <PerksTitle>{c.perksTitle}</PerksTitle>
      <Perk>{c.perk1}</Perk>
      <Perk>{c.perk2}</Perk>
      <CTAButton href={libraryUrl}>{c.cta} →</CTAButton>
      <P dim>{c.outro}</P>
    </EmailLayout>
  );
}

RenewalEmail.PreviewProps = {
  firstName: 'Lucas',
  locale: 'pt',
  amount: 'R$79,90',
  currency: 'BRL',
  nextBillingDate: '15 de junho de 2026',
  manageUrl: 'https://alluretv.net/account',
  libraryUrl: 'https://alluretv.net/',
  homeUrl: 'https://alluretv.net/',
} satisfies RenewalEmailProps;
