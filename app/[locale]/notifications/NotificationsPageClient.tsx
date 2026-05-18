'use client';

// Client-rendered list reading from the NotificationProvider so it stays
// in sync with the bell badge. The provider already fetched everything
// (includeRead=true), so we just render.

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { NotificationItem } from '@/components/notifications/NotificationItem';

export function NotificationsPageClient() {
  const ctx = useNotifications();
  const t = useTranslations('notifications');

  if (!ctx) {
    return (
      <p className="text-text-mute text-sm">
        {t('signInRequired')}
      </p>
    );
  }

  if (ctx.loading) {
    return <p className="text-text-mute text-sm">{t('loading')}</p>;
  }

  if (ctx.items.length === 0) {
    return (
      <div className="text-center py-16">
        <Bell className="size-12 text-text-mute mx-auto mb-4 opacity-40" />
        <p className="text-text-soft font-medium mb-1">{t('empty')}</p>
        <p className="text-text-mute text-sm">{t('emptyHint')}</p>
      </div>
    );
  }

  return (
    <>
      {ctx.unreadCount > 0 && (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => void ctx.markAllAsRead()}
            className="text-xs text-rose-bright hover:text-rose font-medium"
          >
            {t('markAllAsRead')}
          </button>
        </div>
      )}
      <ul className="space-y-1">
        {ctx.items.map((item) => (
          <li key={`${item.source}:${item.id}`}>
            <NotificationItem
              item={item}
              onClick={(id, source) => void ctx.markAsRead(id, source)}
              variant="page"
            />
          </li>
        ))}
      </ul>
    </>
  );
}
