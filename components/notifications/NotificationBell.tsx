'use client';

// The bell button itself. Lives in the TopBar between Search and the
// language picker. Wraps NotificationDropdown so click opens the panel.
// Renders nothing when there's no NotificationProvider in scope (i.e.
// not signed in).

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useNotifications } from './NotificationProvider';
import { NotificationDropdown } from './NotificationDropdown';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const ctx = useNotifications();
  const t = useTranslations('notifications');

  // Not signed in or Supabase off — render nothing.
  if (!ctx) return null;

  const count = ctx.unreadCount;

  return (
    <NotificationDropdown>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('bellAria', { count })}
        className="relative"
      >
        <Bell />
        {count > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full',
              'bg-rose text-white text-[10px] font-bold leading-none',
              'flex items-center justify-center ring-2 ring-bg-deep',
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Button>
    </NotificationDropdown>
  );
}
