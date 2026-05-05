'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, Heart, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StoryComment } from '@/lib/data/comments';

export function StoryComments({
  storyTitle,
  comments,
  initialAverage,
  initialCount,
}: {
  storyId: string;
  storyTitle: string;
  comments: StoryComment[];
  initialAverage: number;
  initialCount: number;
}) {
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [draft, setDraft] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!draft.trim() || userRating === 0) return;
    setSubmitted(true);
    // Sprint 1+ wires this to Supabase + posthog.capture('rating_submitted')
  };

  const hasComments = comments.length > 0;

  return (
    <section className="px-5 md:px-10 lg:px-14 mt-12 md:mt-16 max-w-5xl pb-20">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="size-5 text-rose-bright" />
        <h2 className="font-serif italic text-2xl md:text-3xl font-bold text-white">
          Reviews & Comments
        </h2>
      </div>

      {/* Aggregate rating */}
      <div className="grid md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center bg-bg-elevated rounded-2xl p-6 md:p-8 mb-8 shadow-xl shadow-black/30">
        <div className="text-center md:text-left">
          <p className="font-serif italic text-5xl md:text-6xl font-black text-gold-bright">
            {initialAverage.toFixed(1)}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  'size-5',
                  n <= Math.round(initialAverage)
                    ? 'fill-gold text-gold'
                    : 'text-white/15',
                )}
              />
            ))}
          </div>
          <p className="text-xs text-text-dim mt-1">
            {initialCount.toLocaleString()} reviews
          </p>
        </div>

        <div className="md:pl-6">
          <p className="text-xs font-bold uppercase tracking-widest text-text-mute mb-2">
            Your rating
          </p>
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setUserRating(n)}
                aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={cn(
                    'size-7',
                    n <= (hoverRating || userRating)
                      ? 'fill-gold text-gold'
                      : 'text-white/20',
                  )}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-text-dim">
            {userRating === 0
              ? 'Tap a star to rate this story'
              : userRating === 5
              ? 'Loved it!'
              : userRating === 4
              ? 'Really good'
              : userRating === 3
              ? 'It was okay'
              : userRating === 2
              ? 'Not great'
              : 'Not for me'}
          </p>
        </div>
      </div>

      {/* New comment */}
      <div className="bg-bg-elevated rounded-2xl p-5 md:p-6 mb-8 shadow-lg shadow-black/30">
        <p className="text-xs font-bold uppercase tracking-widest text-text-mute mb-3">
          Leave a comment
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Share what you thought of "${storyTitle}"…`}
          rows={3}
          className="w-full bg-bg-deep rounded-xl px-4 py-3 text-text-soft placeholder:text-text-mute focus:outline-none focus:ring-2 focus:ring-rose/40 resize-none shadow-inner shadow-black/40"
        />
        <div className="flex items-center justify-between mt-3 gap-3">
          <p className="text-xs text-text-mute">
            {userRating === 0
              ? 'Rate the story above before posting.'
              : submitted
              ? '✓ Posted — thank you!'
              : 'Posted as Demo User'}
          </p>
          <Button
            variant="rose"
            disabled={!draft.trim() || userRating === 0 || submitted}
            onClick={submit}
            size="sm"
          >
            <Send className="size-4" /> Post
          </Button>
        </div>
      </div>

      {/* Comment list */}
      {hasComments ? (
        <div className="space-y-4">
          {comments.map((c) => (
            <article
              key={c.id}
              className="bg-bg-elevated rounded-2xl p-5 md:p-6 shadow-md shadow-black/20"
            >
              <header className="flex items-start gap-3 mb-3">
                <span className="relative size-10 rounded-full overflow-hidden bg-bg-deep shrink-0 ring-1 ring-white/10">
                  <Image
                    src={c.avatar}
                    alt={c.user}
                    fill
                    sizes="40px"
                    className="object-cover"
                    unoptimized
                  />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">{c.user}</span>
                    <span className="text-xs text-text-mute">· {c.date}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          'size-3.5',
                          n <= c.stars ? 'fill-gold text-gold' : 'text-white/15',
                        )}
                      />
                    ))}
                  </div>
                </div>
              </header>
              <p className="text-text-soft leading-relaxed mb-3">{c.body}</p>
              <footer className="flex items-center gap-4 text-text-dim text-sm">
                <button className="inline-flex items-center gap-1.5 hover:text-rose-bright transition-colors">
                  <Heart className="size-4" />
                  <span>{c.likes}</span>
                </button>
                <button className="hover:text-rose-bright transition-colors">
                  Reply
                </button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-bg-elevated rounded-2xl p-8 text-center shadow-md shadow-black/20">
          <p className="text-text-dim italic">
            Be the first to leave a review for this story.
          </p>
        </div>
      )}
    </section>
  );
}
