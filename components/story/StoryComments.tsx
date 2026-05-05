'use client';

import { useMemo, useState } from 'react';
import { Star, Heart, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MockComment = {
  id: string;
  user: string;
  initial: string;
  color: string;
  stars: number;
  date: string;
  body: string;
  likes: number;
};

const COMMENT_POOL: MockComment[] = [
  { id: 'c1', user: 'Margaret R.', initial: 'M', color: 'from-rose to-rose-deep', stars: 5, date: '2 days ago', body: "Listened the whole thing in one drive from Tampa to Miami. The narrator's voice is like honey. Couldn't stop.", likes: 47 },
  { id: 'c2', user: 'Sandra K.', initial: 'S', color: 'from-purple-500 to-purple-700', stars: 5, date: '5 days ago', body: 'I needed something for the long winter nights and this hit every spot. The build-up… I was holding my breath.', likes: 32 },
  { id: 'c3', user: 'Linda P.', initial: 'L', color: 'from-amber-500 to-amber-700', stars: 4, date: '1 week ago', body: 'Beautifully written. The chemistry felt real. My only wish is that it was longer — I want a sequel!', likes: 28 },
  { id: 'c4', user: 'Carolyn T.', initial: 'C', color: 'from-rose-deep to-burgundy', stars: 5, date: '1 week ago', body: 'I cried at the kitchen scene. Twice. Beautiful work — the kind of story that reminds you why we read romance.', likes: 41 },
  { id: 'c5', user: 'Diane M.', initial: 'D', color: 'from-teal-500 to-teal-700', stars: 5, date: '2 weeks ago', body: 'Finally an audiobook for grown women. No silly tropes, just slow-burn done right. Sleep timer is heaven.', likes: 19 },
  { id: 'c6', user: 'Patricia W.', initial: 'P', color: 'from-pink-500 to-pink-700', stars: 4, date: '2 weeks ago', body: 'Loved the German narration too — switched between EN and DE just to compare. Both versions are equally moving.', likes: 22 },
  { id: 'c7', user: 'Jennifer A.', initial: 'J', color: 'from-indigo-500 to-indigo-700', stars: 5, date: '3 weeks ago', body: 'My husband caught me listening with headphones and a glass of wine. He asked what was making me smile. I lied. ❤', likes: 67 },
  { id: 'c8', user: 'Susan B.', initial: 'S', color: 'from-emerald-500 to-emerald-700', stars: 5, date: '3 weeks ago', body: 'Used the e-book version on the plane. The chapter art and the prose together are stunning. Worth every penny.', likes: 15 },
  { id: 'c9', user: 'Helen O.', initial: 'H', color: 'from-rose-bright to-rose', stars: 4, date: '1 month ago', body: "Wish there were more stories like this. Strong female lead, slow tension, and zero cringe. More please.", likes: 38 },
  { id: 'c10', user: 'Rosa V.', initial: 'R', color: 'from-orange-500 to-red-600', stars: 5, date: '1 month ago', body: 'Como mexicana, escuché la versión en español y me hizo recordar las novelas que mi madre escuchaba en la radio. Pero más íntimo. Gracias.', likes: 53 },
];

// Pseudo-random pick — deterministic per story so refresh keeps the same comments
const pickComments = (storyId: string, count: number): MockComment[] => {
  const seed = storyId.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const start = seed % COMMENT_POOL.length;
  const out: MockComment[] = [];
  for (let i = 0; i < count; i++) {
    out.push(COMMENT_POOL[(start + i) % COMMENT_POOL.length]);
  }
  return out;
};

export function StoryComments({
  storyId,
  storyTitle,
  initialAverage,
  initialCount,
}: {
  storyId: string;
  storyTitle: string;
  initialAverage: number;
  initialCount: number;
}) {
  const comments = useMemo(() => pickComments(storyId, 4), [storyId]);

  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [draft, setDraft] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!draft.trim() || userRating === 0) return;
    setSubmitted(true);
    // Real Sprint 1+ wires this to Supabase + posthog.capture('rating_submitted')
  };

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
      <div className="space-y-4">
        {comments.map((c) => (
          <article
            key={c.id}
            className="bg-bg-elevated rounded-2xl p-5 md:p-6 shadow-md shadow-black/20"
          >
            <header className="flex items-start gap-3 mb-3">
              <div
                className={cn(
                  'grid place-items-center size-10 rounded-full text-white font-bold bg-gradient-to-br shrink-0',
                  c.color,
                )}
              >
                {c.initial}
              </div>
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
    </section>
  );
}
