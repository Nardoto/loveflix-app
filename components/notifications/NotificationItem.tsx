'use client';

// Single notification row used in both the bell dropdown and the
// /notifications page. Renders avatar/icon + message + relative time.
// Click → markAsRead + navigate to the deep link.

import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { Heart, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  NotificationItem as NotificationItemType,
  NotificationSource,
} from '@/app/actions/notifications';

function relativeTime(iso: string, t: (k: string, v?: Record<string, unknown>) => string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return t('justNow');
  const min = Math.floor(sec / 60);
  if (min < 60) return t('minutesAgo', { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t('hoursAgo', { n: hr });
  const day = Math.floor(hr / 24);
  if (day < 7) return t('daysAgo', { n: day });
  return new Date(iso).toLocaleDateString();
}

function buildHref(item: NotificationItemType): string | null {
  if (item.source === 'announcement') {
    return item.payload.link_path ?? null;
  }
  if (item.payload.story_slug) {
    const anchor = item.payload.parent_comment_id
      ? `#comment-${item.payload.parent_comment_id}`
      : '';
    return `/s/${item.payload.story_slug}${anchor}`;
  }
  return null;
}

function MessageText({ item }: { item: NotificationItemType }) {
  const t = useTranslations('notifications.messages');
  const storyTitle = item.payload.story_title ?? '';

  switch (item.type) {
    case 'reply_official':
      return (
        <p className="text-sm text-text-soft">
          {t.rich('replyOfficial', {
            story: storyTitle,
            strong: (chunks) => (
              <span className="font-semibold text-gold-bright">{chunks}</span>
            ),
          })}
        </p>
      );
    case 'reply_user':
      return (
        <p className="text-sm text-text-soft">
          {t.rich('replyUser', {
            actor: item.payload.actor_display_name ?? 'Someone',
            story: storyTitle,
            strong: (chunks) => (
              <span className="font-semibold text-white">{chunks}</span>
            ),
          })}
        </p>
      );
    case 'comment_like': {
      const count = item.payload.like_count ?? 1;
      const key = count > 1 ? 'commentLikeMany' : 'commentLikeOne';
      return (
        <p className="text-sm text-text-soft">
          {t.rich(key, {
            actor: item.payload.actor_display_name ?? 'Someone',
            count,
            others: Math.max(0, count - 1),
            story: storyTitle,
            strong: (chunks) => (
              <span className="font-semibold text-white">{chunks}</span>
            ),
          })}
        </p>
      );
    }
    case 'announcement':
      return (
        <div className="text-sm text-text-soft">
          <p className="font-semibold text-white truncate">
            {item.payload.title ?? ''}
          </p>
          <p className="text-text-dim line-clamp-2">{item.payload.body ?? ''}</p>
        </div>
      );
    default:
      return null;
  }
}

function Avatar({ item }: { item: NotificationItemType }) {
  if (item.type === 'reply_official') {
    return (
      <div className="size-9 rounded-full bg-gold/15 ring-2 ring-gold/40 flex items-center justify-center shrink-0">
        <span className="font-serif font-black text-gold-bright text-base leading-none">
          A
        </span>
      </div>
    );
  }
  if (item.type === 'announcement') {
    return (
      <div className="size-9 rounded-full bg-rose/15 ring-2 ring-rose/40 flex items-center justify-center shrink-0">
        <Megaphone className="size-4 text-rose-bright" />
      </div>
    );
  }
  if (item.type === 'comment_like') {
    return (
      <div className="size-9 rounded-full bg-rose-deep/30 ring-2 ring-rose/40 flex items-center justify-center shrink-0">
        <Heart className="size-4 text-rose-bright fill-rose-bright" />
      </div>
    );
  }
  // reply_user — actor avatar (or initial)
  const url = item.payload.actor_avatar_url;
  const name = item.payload.actor_display_name ?? '?';
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="size-9 rounded-full object-cover shrink-0 ring-2 ring-white/10"
      />
    );
  }
  return (
    <div className="size-9 rounded-full bg-gradient-to-br from-rose to-rose-deep flex items-center justify-center shrink-0 ring-2 ring-white/10">
      <span className="text-sm font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export function NotificationItem({
  item,
  onClick,
  variant = 'dropdown',
}: {
  item: NotificationItemType;
  onClick: (id: string, source: NotificationSource) => void;
  variant?: 'dropdown' | 'page';
}) {
  const t = useTranslations('notifications');
  const router = useRouter();
  const href = buildHref(item);
  const isUnread = !item.read_at;

  const handleClick = () => {
    if (isUnread) onClick(item.id, item.source);
    if (href) router.push(href as never);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full flex gap-3 text-left transition-colors rounded-xl',
        variant === 'dropdown' ? 'p-3 hover:bg-white/5' : 'p-4 hover:bg-white/5',
        isUnread && 'bg-rose/5',
      )}
    >
      <Avatar item={item} />
      <div className="flex-1 min-w-0">
        <MessageText item={item} />
        <p className="text-xs text-text-mute mt-1">
          {relativeTime(item.created_at, (k, v) => t(k as never, v as never))}
        </p>
      </div>
      {isUnread && (
        <span
          aria-label="Unread"
          className="size-2 rounded-full bg-rose-bright shrink-0 mt-2"
        />
      )}
    </button>
  );
}
