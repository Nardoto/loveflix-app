// Resend SDK — lazy singleton so the build doesn't crash when
// RESEND_API_KEY is missing (which is fine during cold builds before
// env vars land in the deploy). The first send() throws a clear error
// if the key is still absent at runtime.

import 'server-only';
import { Resend } from 'resend';

let cached: Resend | null = null;

export function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      'RESEND_API_KEY is not set. Add it to .env.local and the Vercel project.',
    );
  }
  cached = new Resend(key);
  return cached;
}

export function getFromHeader(): string {
  const name = process.env.EMAIL_FROM_NAME ?? 'AllureTV';
  const address = process.env.EMAIL_FROM_ADDRESS ?? 'hello@alluretv.net';
  return `${name} <${address}>`;
}

export function getReplyTo(): string | undefined {
  return process.env.EMAIL_REPLY_TO || undefined;
}
