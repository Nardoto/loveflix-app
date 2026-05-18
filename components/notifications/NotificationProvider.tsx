'use client';

// Client-side state + realtime for the bell. Wraps the locale tree from
// app/[locale]/layout.tsx when there's a logged-in user; passes nothing
// when there isn't (NotificationBell short-circuits).
//
// Realtime subscriptions:
//   1) notifications:{userId} — INSERT events scoped to me, pushed by
//      service_role inserts in admin.ts / comments.ts.
//   2) announcements — INSERT events for everyone; the bell decides if
//      it should be marked unread by checking against announcement_reads
//      on the next refetch.
//
// Refetches when:
//   - mount (initial fetch)
//   - the tab becomes visible (covers "opened the app")
//   - the dropdown is opened (cheap insurance against stale state)
//   - a realtime INSERT arrives (one round-trip to get the merged list)

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead as markAsReadAction,
  markAllAsRead as markAllAsReadAction,
  type NotificationItem,
  type NotificationSource,
} from '@/app/actions/notifications';

type ContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string, source: NotificationSource) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationContext = createContext<ContextValue | null>(null);

export function useNotifications(): ContextValue | null {
  return useContext(NotificationContext);
}

export function NotificationProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // Coalesce bursts of realtime events into a single refetch.
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    // We always fetch unread first; the dropdown asks for includeRead.
    const [listRes, countRes] = await Promise.all([
      getMyNotifications({ limit: 20, includeRead: true }),
      getUnreadCount(),
    ]);
    if (listRes.ok) setItems(listRes.data);
    if (countRes.ok) setUnreadCount(countRes.data);
    setLoading(false);
  }, []);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(() => {
      void refresh();
    }, 250);
  }, [refresh]);

  // Initial fetch + visibility-change refetch.
  useEffect(() => {
    void refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  // Realtime subscriptions.
  useEffect(() => {
    const supabase = createClient();

    const notifChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleRefetch(),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleRefetch(),
      )
      .subscribe();

    const annChannel = supabase
      .channel('announcements:all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        () => scheduleRefetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(annChannel);
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    };
  }, [userId, scheduleRefetch]);

  const markAsRead = useCallback(
    async (id: string, source: NotificationSource) => {
      // Optimistic update.
      setItems((prev) =>
        prev.map((it) =>
          it.id === id && it.source === source
            ? { ...it, read_at: new Date().toISOString() }
            : it,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      const res = await markAsReadAction({ id, source });
      if (!res.ok) {
        // Refetch authoritative state on failure.
        void refresh();
      }
    },
    [refresh],
  );

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((it) => ({ ...it, read_at: it.read_at ?? now })));
    setUnreadCount(0);
    const res = await markAllAsReadAction();
    if (!res.ok) void refresh();
  }, [refresh]);

  return (
    <NotificationContext.Provider
      value={{ items, unreadCount, loading, refresh, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
