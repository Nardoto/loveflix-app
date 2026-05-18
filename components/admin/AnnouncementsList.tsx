'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteAnnouncement } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';
import type { AnnouncementRow } from '@/app/admin/announcements/page';

export function AnnouncementsList({ items }: { items: AnnouncementRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="text-text-mute text-sm">
        No announcements yet. The form above publishes the first one.
      </p>
    );
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this announcement? Users who already saw it keep it in their bell history.')) {
      return;
    }
    startTransition(async () => {
      await deleteAnnouncement(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-text-mute mb-2">
        Published
      </h3>
      <ul className="space-y-2">
        {items.map((a) => (
          <li
            key={a.id}
            className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 flex gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 mb-1">
                <h4 className="font-bold text-white truncate">{a.title}</h4>
                <span className="text-[11px] text-text-mute shrink-0">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-text-soft line-clamp-2 mb-2">
                {a.body}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-text-mute">
                <span>{a.reads_count} read{a.reads_count === 1 ? '' : 's'}</span>
                {a.link_path && (
                  <span className="font-mono truncate">→ {a.link_path}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleDelete(a.id)}
              className="self-start text-text-mute hover:text-red-400 transition-colors"
              aria-label="Delete announcement"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
