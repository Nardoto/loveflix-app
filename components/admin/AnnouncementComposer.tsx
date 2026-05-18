'use client';

// Compose + publish a platform announcement. Calls postAnnouncement which
// inserts via service_role; Supabase Realtime then pushes the new row to
// every connected bell.

import { useState, useTransition } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { postAnnouncement } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function AnnouncementComposer() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkPath, setLinkPath] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setErr(null);
    if (!title.trim() || !body.trim()) {
      setErr('Title and body are required');
      return;
    }
    startTransition(async () => {
      const res = await postAnnouncement({
        title: title.trim(),
        body: body.trim(),
        linkPath: linkPath.trim() || null,
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setTitle('');
      setBody('');
      setLinkPath('');
      router.refresh();
    });
  };

  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="size-4 text-rose-bright" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          New Announcement
        </h3>
      </div>

      <label className="block mb-3">
        <span className="text-xs text-text-dim font-medium block mb-1.5">
          Title
        </span>
        <input
          type="text"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: New Fazendeiro episode is live"
          className="w-full bg-bg-deep border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-mute focus:outline-none focus:border-rose"
        />
      </label>

      <label className="block mb-3">
        <span className="text-xs text-text-dim font-medium block mb-1.5">
          Body
        </span>
        <textarea
          value={body}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="What's new?"
          className="w-full bg-bg-deep border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-mute focus:outline-none focus:border-rose resize-y"
        />
        <span className="text-[10px] text-text-mute mt-1 block">
          {body.length} / 2000
        </span>
      </label>

      <label className="block mb-4">
        <span className="text-xs text-text-dim font-medium block mb-1.5">
          Link (optional)
        </span>
        <input
          type="text"
          value={linkPath}
          onChange={(e) => setLinkPath(e.target.value)}
          placeholder="/s/fazendeiro"
          className="w-full bg-bg-deep border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-mute focus:outline-none focus:border-rose"
        />
        <span className="text-[10px] text-text-mute mt-1 block">
          When the user clicks the notification, they go here.
        </span>
      </label>

      {err && (
        <p className="text-xs text-red-400 mb-3 font-medium">{err}</p>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending} className="gap-2">
          <Send className="size-3.5" />
          {pending ? 'Publishing…' : 'Publish'}
        </Button>
      </div>
    </div>
  );
}
