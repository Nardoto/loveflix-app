import 'server-only';

// Server-side resolver for the comment list shown on /s/[slug].
//
// Strategy:
// 1. If Supabase isn't configured yet (no env vars), return pure mocks.
//    The mock seed gives every story a stable, varied set of comments out of
//    the box — useful for cold-start social proof and local dev.
//
// 2. If Supabase IS configured, query story_comments_with_counts (a view
//    defined in 0002_comments.sql) for real data:
//      - ≥ 3 real comments → return ONLY real comments (mocks step aside).
//      - 1-2 real comments → real ones first, mocks below to fill the page.
//      - 0 real comments  → pure mocks (looks "established" from day one).
//
// 3. For coming-soon stories we always return mocks. Real comments would be
//    weird on something nobody's seen yet, even from us.
//
// 4. Aggregate rating uses real ratings when there are ≥ 5 of them; otherwise
//    the seeded mock value, so a story with 2 real reviews doesn't suddenly
//    show "5.0 (2 reviews)" which would look fishy.

import type { Story } from './stories';
import {
  generateCommentsForStory,
  type StoryComment,
  type CommentMeta,
} from './comments';
import { createClient } from '@/lib/supabase/server';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const REAL_TAKES_OVER_THRESHOLD = 3;       // ≥ N real → hide all mocks
const REAL_RATING_TAKES_OVER_THRESHOLD = 5; // ≥ N rated → use real avg

// Shape returned by the story_comments_with_counts view.
type RealCommentRow = {
  id: string;
  story_slug: string;
  user_id: string;
  body: string;
  stars: number | null;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
  likes_count: number;
  replies_count: number;
};

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 7) return `${day} days ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk} week${wk === 1 ? '' : 's'} ago`;
  const mo = Math.round(day / 30);
  return `${mo} month${mo === 1 ? '' : 's'} ago`;
}

// Hash → stable picks for anonymous reviewers without a profile.
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Mirror the avatar list from comments.ts so anonymous comments still get a
// stable face. Same indexes; just inlined to avoid exporting from comments.ts.
const ANON_AVATAR_INDEXES = [
  0, 5, 14, 22, 30, 41, 52, 63, 71, 84,
];
const ANON_NAMES = ['Reader', 'Anonymous', 'Listener', 'Visitor'];

function rowToComment(row: RealCommentRow): StoryComment {
  const idx = hashCode(row.user_id);
  const fallbackAvatar =
    `https://randomuser.me/api/portraits/women/${ANON_AVATAR_INDEXES[idx % ANON_AVATAR_INDEXES.length]}.jpg`;
  const fallbackName = `${ANON_NAMES[idx % ANON_NAMES.length]} #${(idx % 9999).toString().padStart(4, '0')}`;
  return {
    id: row.id,
    user: row.display_name || fallbackName,
    avatar: row.avatar_url || fallbackAvatar,
    stars: row.stars ?? undefined,
    date: relativeDate(row.created_at),
    body: row.body,
    likes: row.likes_count,
  };
}

export async function getCommentsForStory(story: Story): Promise<CommentMeta> {
  // Coming-soon stories: always mocks. No one has watched yet.
  if (story.isComingSoon) {
    return generateCommentsForStory(story);
  }

  // Cold path: env vars missing → behave like before.
  if (!SUPABASE_CONFIGURED) {
    return generateCommentsForStory(story);
  }

  let real: RealCommentRow[] = [];
  let realRatedCount = 0;
  let realAvgRating = 0;
  try {
    const supabase = await createClient();

    const [commentsRes, aggRes] = await Promise.all([
      supabase
        .from('story_comments_with_counts')
        .select('*')
        .eq('story_slug', story.slug)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('story_rating_aggregate')
        .select('*')
        .eq('story_slug', story.slug)
        .maybeSingle(),
    ]);

    if (!commentsRes.error && commentsRes.data) {
      real = commentsRes.data as RealCommentRow[];
    }
    if (!aggRes.error && aggRes.data) {
      const row = aggRes.data as { rated_count?: number; avg_rating?: number };
      realRatedCount = row.rated_count ?? 0;
      realAvgRating = Number(row.avg_rating ?? 0);
    }
  } catch {
    // If Supabase blows up (schema not run yet, anonymous auth disabled, etc),
    // silently fall through to the mocks. Better than a 500 on the catalog.
  }

  const mock = generateCommentsForStory(story);

  // Decide which list to show
  let comments: StoryComment[];
  if (real.length >= REAL_TAKES_OVER_THRESHOLD) {
    comments = real.map(rowToComment);
  } else if (real.length > 0) {
    const realMapped = real.map(rowToComment);
    const realIds = new Set(realMapped.map((c) => c.id));
    const fillers = mock.comments.filter((c) => !realIds.has(c.id));
    comments = [...realMapped, ...fillers].slice(0, 8);
  } else {
    comments = mock.comments;
  }

  // Decide which aggregate rating to show
  const useRealRating = realRatedCount >= REAL_RATING_TAKES_OVER_THRESHOLD;
  return {
    comments,
    ratingAvg: useRealRating ? realAvgRating : mock.ratingAvg,
    ratingCount: useRealRating ? realRatedCount : mock.ratingCount,
  };
}
