// Transactional email sender — idempotent, never throws to caller.
//
// The Stripe webhook calls one of the wrappers below (sendWelcomeEmail,
// sendPaymentFailedEmail, etc). Each wrapper:
//
//   1. INSERTs a row in email_log with (user_id, template, idempotency_key).
//      ON CONFLICT DO NOTHING — if Stripe replays the webhook for the same
//      idempotency_key, the second insert returns 0 rows and we silently skip.
//
//   2. Renders the React Email template to HTML.
//
//   3. Calls Resend. On success, UPDATEs the row to status='sent' with the
//      Resend message id. On failure, UPDATEs to status='failed' so a retry
//      job can pick it up later — and SWALLOWS the error so the webhook can
//      still return 200 to Stripe.
//
// Caller responsibility: pass a stable idempotency_key. Stripe gives us one
// for free (subscription id for welcome/cancel, invoice id for billing events).

import 'server-only';
import { render } from '@react-email/render';
import { createServiceClient } from '@/lib/supabase/server';
import { getResend, getFromHeader, getReplyTo } from './client';
import type {
  CancellationEmailProps,
  EmailLocale,
  EmailTemplate,
  PaymentFailedEmailProps,
  RenewalEmailProps,
  WelcomeEmailProps,
} from './types';
import CancellationEmail from './templates/cancellation';
import PaymentFailedEmail from './templates/payment-failed';
import RenewalEmail from './templates/renewal';
import WelcomeEmail from './templates/welcome';
import { EMAIL_COPY } from './copy';
import type { ReactElement } from 'react';

type SendResult =
  | { kind: 'skipped'; reason: 'duplicate' | 'no_address' | 'no_key' }
  | { kind: 'sent'; resendId: string }
  | { kind: 'failed'; error: string };

interface SendOpts {
  userId: string;
  template: EmailTemplate;
  idempotencyKey: string;
  to: string;
  locale: EmailLocale;
  subject: string;
  element: ReactElement;
}

/**
 * Core dispatcher. Wraps every send in mark-first / send-second idempotency
 * and a try/catch that NEVER throws back to the caller — the Stripe webhook
 * must always be free to return 200.
 */
async function sendTransactional(opts: SendOpts): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    return { kind: 'skipped', reason: 'no_key' };
  }
  if (!opts.to || !opts.to.includes('@')) {
    return { kind: 'skipped', reason: 'no_address' };
  }

  const sb = createServiceClient();

  // 1) Claim the slot. ON CONFLICT (unique constraint) returns no rows.
  const { data: inserted, error: insertErr } = await sb
    .from('email_log')
    .insert({
      user_id: opts.userId,
      template: opts.template,
      idempotency_key: opts.idempotencyKey,
      to_address: opts.to,
      locale: opts.locale,
      status: 'pending',
    })
    .select('id')
    .maybeSingle();

  if (insertErr) {
    // Probably the unique constraint — skip silently. Any other error is
    // non-fatal too: we'd rather skip than risk a double-send.
    if (insertErr.code === '23505') {
      return { kind: 'skipped', reason: 'duplicate' };
    }
    console.error('[email] insert email_log failed:', insertErr);
    return { kind: 'failed', error: insertErr.message };
  }

  if (!inserted) {
    // No conflict error but no row — defensive, shouldn't happen with insert.
    return { kind: 'skipped', reason: 'duplicate' };
  }

  // 2) Render + send
  try {
    const html = await render(opts.element);
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: getFromHeader(),
      to: opts.to,
      subject: opts.subject,
      html,
      replyTo: getReplyTo(),
    });

    if (error || !data?.id) {
      const msg = error?.message ?? 'unknown error';
      await sb
        .from('email_log')
        .update({ status: 'failed', error_message: msg })
        .eq('id', inserted.id);
      console.error('[email] resend send failed:', msg);
      return { kind: 'failed', error: msg };
    }

    await sb
      .from('email_log')
      .update({
        status: 'sent',
        resend_id: data.id,
        sent_at: new Date().toISOString(),
      })
      .eq('id', inserted.id);

    return { kind: 'sent', resendId: data.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await sb
      .from('email_log')
      .update({ status: 'failed', error_message: msg })
      .eq('id', inserted.id);
    console.error('[email] send threw:', msg);
    return { kind: 'failed', error: msg };
  }
}

// ────────────────────────────────────────────────────────────────────
// Typed wrappers — one per template
// ────────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  userId: string;
  to: string;
  idempotencyKey: string;
  props: WelcomeEmailProps;
}): Promise<SendResult> {
  return sendTransactional({
    userId: opts.userId,
    template: 'welcome',
    idempotencyKey: opts.idempotencyKey,
    to: opts.to,
    locale: opts.props.locale,
    subject: EMAIL_COPY[opts.props.locale].welcome.subject,
    element: WelcomeEmail(opts.props),
  });
}

export async function sendPaymentFailedEmail(opts: {
  userId: string;
  to: string;
  idempotencyKey: string;
  props: PaymentFailedEmailProps;
}): Promise<SendResult> {
  return sendTransactional({
    userId: opts.userId,
    template: 'payment_failed',
    idempotencyKey: opts.idempotencyKey,
    to: opts.to,
    locale: opts.props.locale,
    subject: EMAIL_COPY[opts.props.locale].payment_failed.subject,
    element: PaymentFailedEmail(opts.props),
  });
}

export async function sendCancellationEmail(opts: {
  userId: string;
  to: string;
  idempotencyKey: string;
  props: CancellationEmailProps;
}): Promise<SendResult> {
  return sendTransactional({
    userId: opts.userId,
    template: 'cancellation',
    idempotencyKey: opts.idempotencyKey,
    to: opts.to,
    locale: opts.props.locale,
    subject: EMAIL_COPY[opts.props.locale].cancellation.subject,
    element: CancellationEmail(opts.props),
  });
}

export async function sendRenewalEmail(opts: {
  userId: string;
  to: string;
  idempotencyKey: string;
  props: RenewalEmailProps;
}): Promise<SendResult> {
  return sendTransactional({
    userId: opts.userId,
    template: 'renewal',
    idempotencyKey: opts.idempotencyKey,
    to: opts.to,
    locale: opts.props.locale,
    subject: EMAIL_COPY[opts.props.locale].renewal.subject,
    element: RenewalEmail(opts.props),
  });
}
