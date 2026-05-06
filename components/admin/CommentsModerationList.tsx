'use client';

import { useState, useTransition } from 'react';
import { Trash2, Star, ExternalLink, Loader2 } from 'lucide-react';
import { adminDeleteComment } from '@/app/actions/admin';
import { cn } from '@/lib/utils';

type Comment = {
  id: string;
  story_slug: string;
  body: string;
  stars: number | null;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h atrás`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} d atrás`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function CommentsModerationList({
  comments,
}: {
  comments: Comment[];
}) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await adminDeleteComment(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRemoved((prev) => new Set(prev).add(id));
      setConfirming(null);
    });
  };

  const visible = comments.filter((c) => !removed.has(c.id));

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      {visible.length === 0 && removed.size > 0 && (
        <p className="text-text-mute italic text-sm">
          Todos os {removed.size} comentários removidos.
        </p>
      )}

      {visible.map((c) => {
        const meta = { display_name: c.display_name, avatar_url: c.avatar_url };
        const isConfirming = confirming === c.id;
        return (
          <article
            key={c.id}
            className={cn(
              'bg-bg-card border border-white/[0.06] rounded-xl p-4 transition-colors',
              isConfirming && 'border-red-500/50',
            )}
          >
            <header className="flex items-start gap-3 mb-3">
              <span
                className="size-9 rounded-full bg-gradient-to-br from-rose to-rose-deep grid place-items-center text-white text-xs font-bold shrink-0 bg-cover bg-center"
                style={
                  meta?.avatar_url
                    ? { backgroundImage: `url(${meta.avatar_url})` }
                    : undefined
                }
              >
                {!meta?.avatar_url &&
                  (meta?.display_name?.charAt(0)?.toUpperCase() ?? '?')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-[13.5px] truncate">
                    {meta?.display_name ?? 'Anônimo'}
                  </span>
                  <span className="text-[11px] text-text-mute">
                    · {relativeTime(c.created_at)}
                  </span>
                  <a
                    href={`/en/s/${c.story_slug}`}
                    target="_blank"
                    rel="noopener"
                    className="text-[11px] text-rose-bright hover:text-rose inline-flex items-center gap-1"
                  >
                    /s/{c.story_slug}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                {typeof c.stars === 'number' && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          'size-3',
                          n <= c.stars!
                            ? 'fill-gold text-gold'
                            : 'text-white/15',
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
              {!isConfirming ? (
                <button
                  onClick={() => setConfirming(c.id)}
                  className="text-[11.5px] text-text-dim hover:text-red-400 px-2.5 py-1 rounded-md border border-white/[0.06] hover:border-red-400 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Remover
                </button>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setConfirming(null)}
                    disabled={isPending}
                    className="text-[11.5px] text-text-dim hover:text-white px-2.5 py-1 rounded-md border border-white/[0.06] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={isPending}
                    className="text-[11.5px] text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Confirmar
                  </button>
                </div>
              )}
            </header>
            <p className="text-text-soft text-[13.5px] leading-relaxed pl-12">
              {c.body}
            </p>
          </article>
        );
      })}
    </div>
  );
}
