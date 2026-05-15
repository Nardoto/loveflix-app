import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { CookiePreferencesLink } from '@/components/consent/CookiePreferencesLink';

export const metadata: Metadata = {
  title: 'Cookie Policy — AllureTV',
  description:
    'Every cookie AllureTV uses, what each one does, and how long it stays on your device.',
};

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('consent.cookies');

  type PurposeKey =
    | 'allure_consent'
    | 'supabase_auth'
    | 'next_locale'
    | 'paywall_from'
    | 'age_verified'
    | 'ph_id'
    | 'ph_session';
  type DurationKey =
    | 'session'
    | 'oneHour'
    | 'sevenDays'
    | 'sixMonths'
    | 'oneYear'
    | 'twoYears';

  const rows: Array<{
    name: string;
    purposeKey: PurposeKey;
    category: 'essential' | 'analytics' | 'session';
    durationKey: DurationKey;
    provider: string;
  }> = [
    { name: 'allure_consent', purposeKey: 'allure_consent', category: 'essential', durationKey: 'sixMonths', provider: 'AllureTV' },
    { name: 'sb-*-auth-token', purposeKey: 'supabase_auth', category: 'essential', durationKey: 'sevenDays', provider: 'Supabase' },
    { name: 'NEXT_LOCALE', purposeKey: 'next_locale', category: 'essential', durationKey: 'oneYear', provider: 'AllureTV' },
    { name: 'paywall-from', purposeKey: 'paywall_from', category: 'essential', durationKey: 'oneHour', provider: 'AllureTV' },
    { name: 'age-verified', purposeKey: 'age_verified', category: 'essential', durationKey: 'twoYears', provider: 'AllureTV' },
    { name: 'ph_*_posthog', purposeKey: 'ph_id', category: 'analytics', durationKey: 'oneYear', provider: 'PostHog' },
    { name: 'ph_*_session', purposeKey: 'ph_session', category: 'session', durationKey: 'session', provider: 'PostHog' },
  ];

  return (
    <LegalLayout title={t('pageTitle')} lastUpdated="May 15, 2026">
      <p>{t('intro')}</p>

      <h2>{t('whatAre.title')}</h2>
      <p>{t('whatAre.p1')}</p>
      <p>{t('whatAre.p2')}</p>

      <h2>{t('table.name')}</h2>
      <div className="not-prose overflow-x-auto -mx-1 my-6">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-text-mute border-b border-white/[0.08]">
              <th className="py-3 px-3">{t('table.name')}</th>
              <th className="py-3 px-3">{t('table.purpose')}</th>
              <th className="py-3 px-3">{t('table.category')}</th>
              <th className="py-3 px-3">{t('table.duration')}</th>
              <th className="py-3 px-3">{t('table.provider')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-white/[0.04]">
                <td className="py-3 px-3 font-mono text-rose-bright text-[12px]">
                  {r.name}
                </td>
                <td className="py-3 px-3 text-text-soft">
                  {t(`table.rows.${r.purposeKey}` as const)}
                </td>
                <td className="py-3 px-3">
                  <span
                    className={[
                      'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide',
                      r.category === 'essential' && 'bg-emerald-500/[0.15] text-emerald-300',
                      r.category === 'analytics' && 'bg-rose/[0.15] text-rose-bright',
                      r.category === 'session' && 'bg-gold/[0.15] text-gold',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {t(`table.categories.${r.category}` as const)}
                  </span>
                </td>
                <td className="py-3 px-3 text-text-soft">
                  {t(`table.durations.${r.durationKey}` as const)}
                </td>
                <td className="py-3 px-3 text-text-soft">{r.provider}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{t('managing.title')}</h2>
      <p>{t('managing.body')}</p>
      <p className="not-prose">
        <CookiePreferencesLink className="inline-flex bg-rose hover:bg-rose-bright text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-lg transition-colors" />
      </p>

      <h2>Contact</h2>
      <p>
        {t.rich('contact', {
          contact: (chunks) => (
            <a href="mailto:hello@alluretv.net">{chunks}</a>
          ),
          privacy: (chunks) => (
            <Link href={`/${locale}/privacy`}>{chunks}</Link>
          ),
        })}
      </p>
    </LegalLayout>
  );
}

