'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, Heart, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StoryComment } from '@/lib/data/comments';

type LocalReply = {
  id: string;
  body: string;
};

type UserComment = {
  id: string;
  body: string;
  stars: number;
};

export function StoryComments({
  storyTitle,
  comments,
  initialAverage,
  initialCount,
  isComingSoon = false,
}: {
  storyId: string;
  storyTitle: string;
  comments: StoryComment[];
  initialAverage: number;
  initialCount: number;
  isComingSoon?: boolean;
}) {
  // ── Top-level comment from the viewer ───────────────────────────────────
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [draft, setDraft] = useState('');
  const [posted, setPosted] = useState<UserComment[]>([]);

  // ── Like state per comment (toggle) ─────────────────────────────────────
  const [likes, setLikes] = useState<Record<string, { count: number; liked: boolean }>>(
    () =>
      Object.fromEntries(
        comments.map((c) => [c.id, { count: c.likes, liked: false }]),
      ),
  );

  // ── Reply state per comment ─────────────────────────────────────────────
  const [replies, setReplies] = useState<
    Record<string, { open: boolean; draft: string; items: LocalReply[] }>
  >({});

  const toggleLike = (id: string) => {
    setLikes((prev) => {
      const cur = prev[id] ?? { count: 0, liked: false };
      return {
        ...prev,
        [id]: cur.liked
          ? { count: cur.count - 1, liked: false }
          : { count: cur.count + 1, liked: true },
      };
    });
  };

  const toggleReplyBox = (id: string) => {
    setReplies((prev) => {
      const cur = prev[id] ?? { open: false, draft: '', items: [] };
      return { ...prev, [id]: { ...cur, open: !cur.open } };
    });
  };

  const setReplyDraft = (id: string, value: string) => {
    setReplies((prev) => {
      const cur = prev[id] ?? { open: true, draft: '', items: [] };
      return { ...prev, [id]: { ...cur, draft: value } };
    });
  };

  const submitReply = (id: string) => {
    setReplies((prev) => {
      const cur = prev[id] ?? { open: true, draft: '', items: [] };
      const text = cur.draft.trim();
      if (!text) return prev;
      const newReply: LocalReply = {
        id: `${id}-r${cur.items.length}`,
        body: text,
      };
      return {
        ...prev,
        [id]: { open: true, draft: '', items: [...cur.items, newReply] },
      };
    });
  };

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    if (!isComingSoon && userRating === 0) return;

    const newComment: UserComment = {
      id: `you-${posted.length}-${Date.now()}`,
      body: text,
      stars: isComingSoon ? 0 : userRating,
    };
    setPosted((prev) => [newComment, ...prev]);
    setDraft('');
    setUserRating(0);
  };

  const hasAnyComment = comments.length > 0 || posted.length > 0;

  return (
    <section className="px-5 md:px-10 lg:px-14 mt-12 md:mt-16 max-w-5xl pb-20">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="size-5 text-rose-bright" />
        <h2 className="font-serif italic text-2xl md:text-3xl font-bold text-white">
          {isComingSoon ? 'Anticipation' : 'Reviews & Comments'}
        </h2>
      </div>

      {/* Aggregate rating — hidden for coming-soon (nothing to rate yet) */}
      {!isComingSoon && (
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
                  type="button"
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
      )}

      {/* New comment box */}
      <div className="bg-bg-elevated rounded-2xl p-5 md:p-6 mb-8 shadow-lg shadow-black/30">
        <p className="text-xs font-bold uppercase tracking-widest text-text-mute mb-3">
          {isComingSoon ? 'Drop a note' : 'Leave a comment'}
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            isComingSoon
              ? `Tell us what you think about "${storyTitle}"…`
              : `Share what you thought of "${storyTitle}"…`
          }
          rows={3}
          className="w-full bg-bg-deep rounded-xl px-4 py-3 text-text-soft placeholder:text-text-mute focus:outline-none focus:ring-2 focus:ring-rose/40 resize-none shadow-inner shadow-black/40"
        />
        <div className="flex items-center justify-between mt-3 gap-3">
          <p className="text-xs text-text-mute">
            {isComingSoon
              ? 'Posted as Demo User'
              : userRating === 0
              ? 'Rate the story above before posting.'
              : 'Posted as Demo User'}
          </p>
          <Button
            variant="rose"
            disabled={!draft.trim() || (!isComingSoon && userRating === 0)}
            onClick={submit}
            size="sm"
          >
            <Send className="size-4" /> Post
          </Button>
        </div>
      </div>

      {/* Comment list */}
      {hasAnyComment ? (
        <div className="space-y-4">
          {/* Viewer's just-posted comments at the top */}
          {posted.map((p) => (
            <article
              key={p.id}
              className="bg-bg-elevated rounded-2xl p-5 md:p-6 shadow-md shadow-black/20 ring-1 ring-rose/30"
            >
              <header className="flex items-start gap-3 mb-3">
                <span className="grid place-items-center size-10 rounded-full bg-gradient-to-br from-rose to-rose-deep text-white font-bold shrink-0">
                  Y
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">You</span>
                    <span className="text-xs text-text-mute">· just now</span>
                  </div>
                  {p.stars > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cn(
                            'size-3.5',
                            n <= p.stars ? 'fill-gold text-gold' : 'text-white/15',
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </header>
              <p className="text-text-soft leading-relaxed">{p.body}</p>
            </article>
          ))}

          {/* Pre-seeded comments */}
          {comments.map((c) => {
            const likeState = likes[c.id] ?? { count: c.likes, liked: false };
            const replyState = replies[c.id] ?? { open: false, draft: '', items: [] };

            return (
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
                    {typeof c.stars === 'number' && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              'size-3.5',
                              n <= c.stars!
                                ? 'fill-gold text-gold'
                                : 'text-white/15',
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </header>
                <p className="text-text-soft leading-relaxed mb-3">{c.body}</p>
                <footer className="flex items-center gap-4 text-text-dim text-sm">
                  <button
                    type="button"
                    onClick={() => toggleLike(c.id)}
                    aria-pressed={likeState.liked}
                    aria-label={likeState.liked ? 'Unlike' : 'Like'}
                    className={cn(
                      'inline-flex items-center gap-1.5 transition-colors active:scale-95 px-2 py-1 -mx-2 -my-1 rounded-md',
                      likeState.liked
                        ? 'text-rose-bright'
                        : 'hover:text-rose-bright',
                    )}
                  >
                    <Heart
                      className={cn(
                        'size-4 transition-all',
                        likeState.liked && 'fill-rose-bright',
                      )}
                    />
                    <span>{likeState.count}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleReplyBox(c.id)}
                    className="hover:text-rose-bright transition-colors active:scale-95 px-2 py-1 -mx-2 -my-1 rounded-md"
                  >
                    {replyState.open ? 'Cancel' : 'Reply'}
                  </button>
                </footer>

                {/* Reply box + inline replies */}
                {replyState.open && (
                  <div className="mt-4 pl-4 md:pl-6 border-l-2 border-rose/20 space-y-3">
                    {replyState.items.map((r) => (
                      <div
                        key={r.id}
                        className="bg-bg-deep rounded-xl p-3 shadow-inner shadow-black/30"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="grid place-items-center size-6 rounded-full bg-gradient-to-br from-rose to-rose-deep text-white text-[10px] font-bold">
                            Y
                          </span>
                          <span className="text-xs font-bold text-white">You</span>
                          <span className="text-[10px] text-text-mute">· just now</span>
                        </div>
                        <p className="text-sm text-text-soft leading-relaxed">
                          {r.body}
                        </p>
                      </div>
                    ))}
                    <div>
                      <textarea
                        value={replyState.draft}
                        onChange={(e) => setReplyDraft(c.id, e.target.value)}
                        placeholder={`Reply to ${c.user}…`}
                        rows={2}
                        className="w-full bg-bg-deep rounded-xl px-3 py-2 text-sm text-text-soft placeholder:text-text-mute focus:outline-none focus:ring-2 focus:ring-rose/40 resize-none shadow-inner shadow-black/40"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="rose"
                          size="sm"
                          disabled={!replyState.draft.trim()}
                          onClick={() => submitReply(c.id)}
                        >
                          <Send className="size-3.5" /> Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-bg-elevated rounded-2xl p-8 text-center shadow-md shadow-black/20">
          <p className="text-text-dim italic">
            {isComingSoon
              ? 'Be the first to drop a note about this upcoming story.'
              : 'Be the first to leave a review for this story.'}
          </p>
        </div>
      )}
    </section>
  );
}
