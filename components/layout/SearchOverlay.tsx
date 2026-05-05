'use client';

// Full-screen search overlay — opened from the magnifying glass icon in
// TopBar. Filters allStories client-side by title + genre + tropes.
// Apple Books / Netflix-style: a focused input at top, live results below.

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { allStories } from '@/lib/data/stories';
import { cn } from '@/lib/utils';

const MAX_RESULTS = 24;

export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  // Reset query when closed so reopening starts fresh.
  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return allStories
      .filter((s) => {
        const hay = [s.title, s.genre, ...(s.tropes ?? [])]
          .join(' ')
          .toLowerCase();
        return hay.includes(term);
      })
      .slice(0, MAX_RESULTS);
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-bg-deep/98 backdrop-blur-xl flex flex-col">
      <div className="flex items-center gap-3 px-4 md:px-8 h-16 border-b border-border shrink-0">
        <Search className="size-5 text-text-dim shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, genre, trope…"
          className="flex-1 bg-transparent border-none outline-none text-base text-white placeholder:text-text-mute"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="grid place-items-center size-10 -mr-2 rounded-full hover:bg-white/5 active:bg-white/10 transition-colors text-text-soft"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-12 pt-4">
        {q.trim().length === 0 ? (
          <p className="text-text-mute text-sm py-12 text-center">
            Type to search the catalog.
          </p>
        ) : results.length === 0 ? (
          <p className="text-text-mute text-sm py-12 text-center">
            No stories match <span className="text-text-soft">&quot;{q}&quot;</span>.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
            {results.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/s/${s.slug}` as never}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-xl bg-bg-card hover:bg-bg-elevated active:bg-bg-elevated transition-colors',
                  )}
                >
                  <div className="relative size-16 shrink-0 rounded-lg overflow-hidden bg-bg-elevated">
                    <Image
                      src={s.cover}
                      alt={s.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-bright/80">
                      {s.genre.replace(/_/g, ' ')}
                    </p>
                    <p className="font-serif italic text-sm font-bold text-white truncate">
                      {s.title}
                    </p>
                    <p className="text-xs text-text-dim truncate mt-0.5">
                      {s.synopsis}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
