// Shared types for the transactional email layer. Environment-neutral —
// importable from server and client (templates render via SSR).

export type EmailTemplate = 'welcome' | 'payment_failed' | 'cancellation' | 'renewal';
export type EmailStatus = 'pending' | 'sent' | 'failed';
export type EmailLocale = 'en' | 'pt' | 'es' | 'de' | 'fr';

export const EMAIL_LOCALES: readonly EmailLocale[] = ['en', 'pt', 'es', 'de', 'fr'];
export const EMAIL_LOCALE_FALLBACK: EmailLocale = 'en';

export interface PlanInfo {
  label: string;       // human label, e.g. "Monthly"
  amount: string;      // formatted, e.g. "$14.99" or "R$79,90"
  currency: 'USD' | 'BRL' | 'EUR';
}

// Props shared by every template — header, footer, urls.
export interface BaseEmailProps {
  firstName: string;
  locale: EmailLocale;
  manageUrl: string;   // /account
  homeUrl: string;     // /
}

export interface WelcomeEmailProps extends BaseEmailProps {
  plan: PlanInfo;
  libraryUrl: string;  // /library or /
}

export interface PaymentFailedEmailProps extends BaseEmailProps {
  amount: string;
  currency: PlanInfo['currency'];
  billingUrl: string;  // /account/billing
  retryHint?: string;  // optional "we'll retry on May 20" style message
}

export interface CancellationEmailProps extends BaseEmailProps {
  accessUntil: string;   // formatted date in user's locale
  reactivateUrl: string; // /subscribe
}

export interface RenewalEmailProps extends BaseEmailProps {
  amount: string;
  currency: PlanInfo['currency'];
  nextBillingDate: string;
  libraryUrl: string;
}
