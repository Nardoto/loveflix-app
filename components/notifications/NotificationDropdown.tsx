'use client';

// Dropdown panel anchored to the bell. Shows last 10 items, with unread
// grouped at the top. Has "mark all read" + "view all" footer.

import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from './NotificationProvider';
import { NotificationItem } from './NotificationItem';
import { Bell } from 'lucide-react';
import { useState } from 'react';

export function NotificationDropdown({ children }: { children: React.ReactNode }) {
  const ctx = useNotifications();
  const t = useTranslations('notifications');
  const [open, setOpen] = useState(false);

  if (!ctx) return null;

  const visible = ctx.items.slice(0, 10);
  const hasUnread = ctx.unreadCount > 0;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) void ctx.refresh();
      }}
    >
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(92vw,380px)] max-h-[70vh] overflow-y-auto p-0"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0 bg-bg-elevated/95 backdrop-blur-xl">
          <span className="font-bold text-white text-sm">{t('title')}</span>
          {hasUnread && (
            <button
              type="button"
              onClick={() => void ctx.markAllAsRead()}
              className="text-xs text-rose-bright hover:text-rose font-medium"
            >
              {t('markAllAsRead')}
            </button>
          )}
        </header>

        {ctx.loading ? (
          <p className="px-4 py-8 text-center text-sm text-text-mute">
            {t('loading')}
          </p>
        ) : visible.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell className="size-8 text-text-mute mx-auto mb-2 opacity-50" />
            <p className="text-sm text-text-mute">{t('empty')}</p>
          </div>
        ) : (
          <ul className="p-1.5">
            {visible.map((item) => (
              <li key={`${item.source}:${item.id}`}>
                <NotificationItem
                  item={item}
                  onClick={(id, source) => void ctx.markAsRead(id, source)}
                />
              </li>
            ))}
          </ul>
        )}

        <footer className="border-t border-white/5 sticky bottom-0 bg-bg-elevated/95 backdrop-blur-xl">
          <Link
            href="/notifications"
            className="block w-full px-4 py-3 text-center text-sm font-medium text-rose-bright hover:bg-white/5 transition-colors"
            onClick={() => setOpen(false)}
          >
            {t('viewAll')}
          </Link>
        </footer>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
