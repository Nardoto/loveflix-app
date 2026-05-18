// Dev-only HTML preview for email templates. Gated by EMAIL_PREVIEW_ENABLED
// so production deploys 404 if the flag is missing.
//
// Usage:
//   /api/email/preview/welcome?locale=pt
//   /api/email/preview/payment_failed?locale=de
//   /api/email/preview/cancellation?locale=es
//   /api/email/preview/renewal?locale=fr

import { render } from '@react-email/render';
import { NextRequest, NextResponse } from 'next/server';
import type { ReactElement } from 'react';
import WelcomeEmail from '@/lib/email/templates/welcome';
import PaymentFailedEmail from '@/lib/email/templates/payment-failed';
import CancellationEmail from '@/lib/email/templates/cancellation';
import RenewalEmail from '@/lib/email/templates/renewal';
import {
  EMAIL_LOCALES,
  type EmailLocale,
  type EmailTemplate,
} from '@/lib/email/types';

export const dynamic = 'force-dynamic';

function isEmailTemplate(s: string): s is EmailTemplate {
  return s === 'welcome' || s === 'payment_failed' || s === 'cancellation' || s === 'renewal';
}

function isEmailLocale(s: string): s is EmailLocale {
  return (EMAIL_LOCALES as readonly string[]).includes(s);
}

// Switch (instead of a map) keeps each template's props strictly typed —
// otherwise TS collapses Component(props) into the intersection of all 4
// prop types, which then fails for every concrete shape.
function renderTemplate(t: EmailTemplate, locale: EmailLocale): ReactElement {
  switch (t) {
    case 'welcome':
      return WelcomeEmail({ ...WelcomeEmail.PreviewProps, locale });
    case 'payment_failed':
      return PaymentFailedEmail({ ...PaymentFailedEmail.PreviewProps, locale });
    case 'cancellation':
      return CancellationEmail({ ...CancellationEmail.PreviewProps, locale });
    case 'renewal':
      return RenewalEmail({ ...RenewalEmail.PreviewProps, locale });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ template: string }> },
) {
  if (process.env.EMAIL_PREVIEW_ENABLED !== 'true') {
    return new NextResponse('Not found', { status: 404 });
  }

  const { template } = await params;
  if (!isEmailTemplate(template)) {
    return new NextResponse(
      `Unknown template "${template}". Use: welcome | payment_failed | cancellation | renewal`,
      { status: 400 },
    );
  }

  const localeParam = req.nextUrl.searchParams.get('locale') ?? 'en';
  const locale: EmailLocale = isEmailLocale(localeParam) ? localeParam : 'en';

  const html = await render(renderTemplate(template, locale));

  return new NextResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
