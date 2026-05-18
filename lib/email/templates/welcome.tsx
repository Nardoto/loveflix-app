import { EMAIL_COPY, interpolate } from '../copy';
import type { WelcomeEmailProps } from '../types';
import {
  CTAButton,
  Confirmation,
  EmailLayout,
  H1,
  P,
  Perk,
  PerksTitle,
} from './_layout';

export default function WelcomeEmail({
  firstName,
  locale,
  plan,
  manageUrl,
  libraryUrl,
}: WelcomeEmailProps) {
  const c = EMAIL_COPY[locale].welcome;
  const heading = interpolate(c.heading, { firstName });
  const confirmed = interpolate(c.confirmed, { planLabel: plan.label });

  return (
    <EmailLayout
      preview={c.preheader}
      manageUrl={manageUrl}
      manageLabel={c.footerManage}
      legalLine={c.footerLegal}
    >
      <H1>{heading}</H1>
      <Confirmation>
        {confirmed} · {plan.amount} {plan.currency}
      </Confirmation>
      <P>{c.intro}</P>
      <PerksTitle>{c.perksTitle}</PerksTitle>
      <Perk>{c.perk1}</Perk>
      <Perk>{c.perk2}</Perk>
      <Perk>{c.perk3}</Perk>
      <CTAButton href={libraryUrl}>{c.cta} →</CTAButton>
      <P dim>{c.ps}</P>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  firstName: 'Lucas',
  locale: 'pt',
  plan: { label: 'Mensal', amount: 'R$79,90', currency: 'BRL' },
  manageUrl: 'https://alluretv.net/account',
  libraryUrl: 'https://alluretv.net/',
  homeUrl: 'https://alluretv.net/',
} satisfies WelcomeEmailProps;
