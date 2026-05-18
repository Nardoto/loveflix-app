import { setRequestLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth-helpers';
import { NotificationsPageClient } from './NotificationsPageClient';

// Full bell history. Server gate: redirect to login when anonymous; rest
// of the rendering is client-side so it can read from the
// NotificationProvider that wraps the layout (no double-fetch).

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) {
    redirect(`/${locale}/login?returnTo=/${locale}/notifications`);
  }

  const t = await getTranslations('notifications');
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-24 pb-16">
      <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight mb-1">
        {t('pageTitle')}
      </h1>
      <p className="text-text-dim text-sm mb-8">{t('pageSubtitle')}</p>
      <NotificationsPageClient />
    </div>
  );
}
