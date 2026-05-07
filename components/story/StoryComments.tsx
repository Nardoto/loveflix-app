'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Star, Heart, MessageCircle, Send, Loader2, LogIn, Pencil, Trash2 } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StoryComment } from '@/lib/data/comments';
import {
  postComment,
  toggleLike as toggleLikeAction,
  postReply as postReplyAction,
  editComment as editCommentAction,
  deleteComment as deleteCommentAction,
} from '@/app/actions/comments';

type LocalReply = {
  id: string;
  body: string;
};

type UserComment = {
  id: string;
  body: string;
  stars: number;
};

// Real Supabase IDs are UUIDs. Mock IDs are short strings like "045-c2".
// Only attempt server actions for real comments — mock likes/replies stay local.
const isRealCommentId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function StoryComments({
  storyTitle,
  storySlug,
  comments,
  initialAverage,
  initialCount,
  isComingSoon = false,
  isSignedIn = false,
  currentUserId = null,
  currentUserName = null,
  currentUserAvatar = null,
}: {
  storyId: string;
  storyTitle: string;
  storySlug: string;
  comments: StoryComment[];
  initialAverage: number;
  initialCount: number;
  isComingSoon?: boolean;
  isSignedIn?: boolean;
  /** Server-resolved auth uid. Used to show Edit/Delete on the user's own
   *  comments. Null when the viewer isn't signed in. */
  currentUserId?: string | null;
  /** Display name from Google/Supabase metadata for the optimistic UI. */
  currentUserName?: string | null;
  /** Avatar URL from Google for the optimistic UI. */
  currentUserAvatar?: string | null;
}) {
  // ── New top-level comment from the viewer ───────────────────────────────
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [draft, setDraft] = useState('');
  const [posted, setPosted] = useState<UserComment[]>([]);
  const [postError, setPostError] = useState<string | null>(null);
  const [isPosting, startPosting] = useTransition();
  const [signInPromptFor, setSignInPromptFor] = useState<
    'post' | 'like' | 'reply' | null
  >(null);

  // Build a "Sign in & come back" link with returnTo param so the user
  // lands back on this story after authenticating.
  const signInHref = `/login?returnTo=${encodeURIComponent(`/s/${storySlug}`)}`;

  // ── Like state per comment (toggle, optimistic) ─────────────────────────
  const [likes, setLikes] = useState<Record<string, { count: number; liked: boolean }>>(
    () =>
      Object.fromEntries(
        comments.map((c) => [c.id, { count: c.likes, liked: false }]),
      ),
  );

  // ── Reply state per comment (open/closed + draft + submitted replies) ───
  const [replies, setReplies] = useState<
    Record<string, { open: boolean; draft: string; items: LocalReply[]; sending: boolean }>
  >({});

  // ── Edit state — at most one comment is being edited at a time ──────────
  // We hold the in-progress draft separately from the comment list so
  // hitting Cancel discards changes cleanly and the original `comments`
  // prop never gets mutated.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editStars, setEditStars] = useState(0);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, startSavingEdit] = useTransition();
  // Local overrides for edited/deleted comments — keeps the UI in sync
  // without a full server round-trip after the action succeeds.
  const [overrides, setOverrides] = useState<
    Record<string, { body?: string; stars?: number; deleted?: boolean }>
  >({});

  const beginEdit = (c: StoryComment) => {
    setEditingId(c.id);
    setEditDraft(overrides[c.id]?.body ?? c.body);
    setEditStars(overrides[c.id]?.stars ?? c.stars ?? 0);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
    setEditStars(0);
    setEditError(null);
  };

  const saveEdit = (commentId: string, originalHadStars: boolean) => {
    const text = editDraft.trim();
    if (!text) {
      setEditError('Comentário não pode ficar vazio');
      return;
    }
    setEditError(null);
    startSavingEdit(async () => {
      const res = await editCommentAction({
        commentId,
        storySlug,
        body: text,
        stars: originalHadStars ? editStars || null : null,
      });
      if (!res.ok) {
        setEditError(res.error);
        return;
      }
      setOverrides((prev) => ({
        ...prev,
        [commentId]: {
          ...prev[commentId],
          body: text,
          stars: originalHadStars ? editStars : undefined,
        },
      }));
      cancelEdit();
    });
  };

  const removeComment = (commentId: string) => {
    if (!confirm('Apagar esse comentário?')) return;
    // Optimistic hide
    setOverrides((prev) => ({
      ...prev,
      [commentId]: { ...prev[commentId], deleted: true },
    }));
    deleteCommentAction({ commentId, storySlug }).then((res) => {
      if (!res.ok) {
        // Roll back the optimistic delete
        setOverrides((prev) => ({
          ...prev,
          [commentId]: { ...prev[commentId], deleted: false },
        }));
        alert(res.error);
      }
    });
  };

  const toggleLike = (id: string) => {
    if (!isSignedIn) {
      setSignInPromptFor('like');
      return;
    }

    // Optimistic flip
    setLikes((prev) => {
      const cur = prev[id] ?? { count: 0, liked: false };
      return {
        ...prev,
        [id]: cur.liked
          ? { count: cur.count - 1, liked: false }
          : { count: cur.count + 1, liked: true },
      };
    });

    // Mock comments don't have a UUID — keep them local-only
    if (!isRealCommentId(id)) return;

    // Fire and forget; on failure, revert
    toggleLikeAction({ commentId: id, storySlug }).then((res) => {
      if (!res.ok) {
        setLikes((prev) => {
          const cur = prev[id] ?? { count: 0, liked: false };
          return {
            ...prev,
            [id]: cur.liked
              ? { count: cur.count - 1, liked: false }
              : { count: cur.count + 1, liked: true },
          };
        });
        if ('requiresLogin' in res && res.requiresLogin) {
          setSignInPromptFor('like');
        }
      }
    });
  };

  const toggleReplyBox = (id: string) => {
    if (!isSignedIn) {
      setSignInPromptFor('reply');
      return;
    }
    setReplies((prev) => {
      const cur = prev[id] ?? { open: false, draft: '', items: [], sending: false };
      return { ...prev, [id]: { ...cur, open: !cur.open } };
    });
  };

  const setReplyDraft = (id: string, value: string) => {
    setReplies((prev) => {
      const cur = prev[id] ?? { open: true, draft: '', items: [], sending: false };
      return { ...prev, [id]: { ...cur, draft: value } };
    });
  };

  const submitReply = (id: string) => {
    const cur = replies[id] ?? { open: true, draft: '', items: [], sending: false };
    const text = cur.draft.trim();
    if (!text) return;
    if (!isSignedIn) {
      setSignInPromptFor('reply');
      return;
    }

    // Optimistic insert
    const optimisticReply: LocalReply = {
      id: `${id}-r${cur.items.length}-${Date.now()}`,
      body: text,
    };
    setReplies((prev) => ({
      ...prev,
      [id]: {
        open: true,
        draft: '',
        items: [...(prev[id]?.items ?? []), optimisticReply],
        sending: true,
      },
    }));

    if (!isRealCommentId(id)) {
      // Mock comment — keep reply local only
      setReplies((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? optimisticEmpty()), sending: false },
      }));
      return;
    }

    postReplyAction({ parentId: id, storySlug, body: text }).then((res) => {
      setReplies((prev) => {
        const state = prev[id] ?? optimisticEmpty();
        if (!res.ok) {
          // Roll back the optimistic reply
          if ('requiresLogin' in res && res.requiresLogin) {
            setSignInPromptFor('reply');
          }
          return {
            ...prev,
            [id]: {
              ...state,
              items: state.items.filter((r) => r.id !== optimisticReply.id),
              sending: false,
            },
          };
        }
        return { ...prev, [id]: { ...state, sending: false } };
      });
    });
  };

  const submit = () => {
    const text = draft.trim();
    // Rating is OPTIONAL on every kind of story — viewers should be able
    // to drop a comment without committing to stars. If they did pick a
    // rating, we record it; otherwise we send null and the comment shows
    // up without the star strip.
    if (!text) return;
    if (!isSignedIn) {
      setSignInPromptFor('post');
      return;
    }

    setPostError(null);
    const optimistic: UserComment = {
      id: `you-${posted.length}-${Date.now()}`,
      body: text,
      stars: userRating, // 0 means "no rating" — render hides the star strip
    };

    // Optimistic insert at top
    setPosted((prev) => [optimistic, ...prev]);
    const savedDraft = draft;
    const savedRating = userRating;
    setDraft('');
    setUserRating(0);

    startPosting(async () => {
      const res = await postComment({
        storySlug,
        body: text,
        stars: userRating > 0 ? userRating : null,
      });
      if (!res.ok) {
        // Rollback
        setPosted((prev) => prev.filter((p) => p.id !== optimistic.id));
        setDraft(savedDraft);
        setUserRating(savedRating);
        setPostError(res.error);
        if ('requiresLogin' in res && res.requiresLogin) {
          setSignInPromptFor('post');
        }
      }
    });
  };

  const hasComments = comments.length > 0 || posted.length > 0;

  return (
    <section className="px-5 md:px-10 lg:px-14 mt-12 md:mt-16 max-w-5xl pb-20">
      {/* Sign-in prompt modal — shown when guest tries to like/reply/post */}
      {signInPromptFor && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center px-4"
          onClick={() => setSignInPromptFor(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-card rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl shadow-black/70 border border-rose-bright/20"
          >
            <div className="grid place-items-center size-14 rounded-full bg-gradient-to-br from-rose to-rose-deep text-white mx-auto mb-4 shadow-lg shadow-rose/30">
              <LogIn className="size-6" />
            </div>
            <h3 className="font-serif italic text-2xl font-bold text-white text-center mb-2">
              Sign in to {signInPromptFor === 'like' ? 'like' : signInPromptFor === 'reply' ? 'reply' : 'comment'}
            </h3>
            <p className="text-text-dim text-center text-sm mb-6 leading-relaxed">
              Join AllureTV — it&apos;s free and takes a minute. You&apos;ll be able to
              comment, rate stories, and save your favorites.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild variant="rose" className="w-full">
                <Link href={signInHref as never}>
                  <LogIn className="size-4" /> Sign in / Create account
                </Link>
              </Button>
              <Button
                variant="glass"
                className="w-full"
                onClick={() => setSignInPromptFor(null)}
              >
                Maybe later
              </Button>
            </div>
          </div>
        </div>
      )}

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
              ? `Tell the team what you think about "${storyTitle}"…`
              : `Share what you thought of "${storyTitle}"…`
          }
          rows={3}
          className="w-full bg-bg-deep rounded-xl px-4 py-3 text-text-soft placeholder:text-text-mute focus:outline-none focus:ring-2 focus:ring-rose/40 resize-none shadow-inner shadow-black/40"
        />
        <div className="flex items-center justify-between mt-3 gap-3">
          <p className="text-xs text-text-mute">
            {postError ? (
              <span className="text-rose-bright">{postError}</span>
            ) : userRating > 0 ? (
              `Rating ${userRating}★ · posting as you`
            ) : isComingSoon ? (
              'Posting as you'
            ) : (
              'Star rating is optional — comment freely.'
            )}
          </p>
          <Button
            variant="rose"
            disabled={!draft.trim() || isPosting}
            onClick={submit}
            size="sm"
          >
            {isPosting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Posting…
              </>
            ) : (
              <>
                <Send className="size-4" /> Post
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Comment list */}
      {hasComments ? (
        <div className="space-y-4">
          {/* Viewer's just-posted comments at the top — uses the real Google
              name/avatar from auth so the optimistic card matches what the
              user expects to see (and what'll come back from the DB on F5). */}
          {posted.map((p) => {
            const initial = (currentUserName ?? 'U').charAt(0).toUpperCase();
            return (
              <article
                key={p.id}
                className="bg-bg-elevated rounded-2xl p-5 md:p-6 shadow-md shadow-black/20 ring-1 ring-rose/30"
              >
                <header className="flex items-start gap-3 mb-3">
                  {currentUserAvatar ? (
                    <span className="relative size-10 rounded-full overflow-hidden bg-bg-deep shrink-0 ring-1 ring-rose/40">
                      <Image
                        src={currentUserAvatar}
                        alt={currentUserName ?? 'You'}
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                      />
                    </span>
                  ) : (
                    <span className="grid place-items-center size-10 rounded-full bg-gradient-to-br from-rose to-rose-deep text-white font-bold shrink-0">
                      {initial}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">
                        {currentUserName ?? 'Você'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose/20 text-rose-bright">
                        Você
                      </span>
                      <span className="text-xs text-text-mute">· agora</span>
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
            );
          })}

          {/* Pre-seeded / real comments */}
          {comments.map((c) => {
            const ov = overrides[c.id];
            if (ov?.deleted) return null;

            const likeState = likes[c.id] ?? { count: c.likes, liked: false };
            const replyState =
              replies[c.id] ?? { open: false, draft: '', items: [], sending: false };
            const isOwn =
              !!currentUserId && !!c.userId && c.userId === currentUserId;
            const isEditing = editingId === c.id;
            const displayBody = ov?.body ?? c.body;
            const displayStars = ov?.stars ?? c.stars;
            const originalHadStars = typeof c.stars === 'number';

            return (
              <article
                key={c.id}
                className={cn(
                  'bg-bg-elevated rounded-2xl p-5 md:p-6 shadow-md shadow-black/20',
                  isOwn && 'ring-1 ring-rose/20',
                )}
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
                      {isOwn && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose/20 text-rose-bright">
                          Você
                        </span>
                      )}
                      <span className="text-xs text-text-mute">· {c.date}</span>
                    </div>
                    {typeof displayStars === 'number' && !isEditing && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              'size-3.5',
                              n <= displayStars
                                ? 'fill-gold text-gold'
                                : 'text-white/15',
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </header>

                {isEditing ? (
                  <div className="mb-3">
                    {originalHadStars && (
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setEditStars(n)}
                            aria-label={`Avaliar com ${n} estrela${n > 1 ? 's' : ''}`}
                            className="p-0.5 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={cn(
                                'size-5',
                                n <= editStars
                                  ? 'fill-gold text-gold'
                                  : 'text-white/20',
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      className="w-full bg-bg-deep rounded-xl px-3 py-2 text-text-soft placeholder:text-text-mute focus:outline-none focus:ring-2 focus:ring-rose/40 resize-none shadow-inner shadow-black/40"
                    />
                    <div className="flex items-center justify-between mt-2 gap-3">
                      <p className="text-xs">
                        {editError ? (
                          <span className="text-rose-bright">{editError}</span>
                        ) : (
                          <span className="text-text-mute">Editando seu comentário</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                          disabled={isSavingEdit}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="rose"
                          size="sm"
                          onClick={() => saveEdit(c.id, originalHadStars)}
                          disabled={!editDraft.trim() || isSavingEdit}
                        >
                          {isSavingEdit ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" /> Salvando
                            </>
                          ) : (
                            'Salvar'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-text-soft leading-relaxed mb-3">
                    {displayBody}
                    {ov?.body && (
                      <span className="ml-2 text-[10px] uppercase tracking-widest text-text-mute">
                        (editado)
                      </span>
                    )}
                  </p>
                )}

                <footer className="flex items-center gap-4 text-text-dim text-sm flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleLike(c.id)}
                    aria-pressed={likeState.liked}
                    aria-label={likeState.liked ? 'Unlike' : 'Like'}
                    className={cn(
                      'inline-flex items-center gap-1.5 transition-colors active:scale-95',
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
                    className="hover:text-rose-bright transition-colors active:scale-95"
                  >
                    {replyState.open ? 'Cancel' : 'Reply'}
                  </button>
                  {isOwn && !isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={() => beginEdit(c)}
                        className="inline-flex items-center gap-1 hover:text-rose-bright transition-colors active:scale-95 ml-auto"
                        aria-label="Editar comentário"
                      >
                        <Pencil className="size-3.5" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => removeComment(c.id)}
                        className="inline-flex items-center gap-1 hover:text-rose-bright transition-colors active:scale-95"
                        aria-label="Apagar comentário"
                      >
                        <Trash2 className="size-3.5" /> Apagar
                      </button>
                    </>
                  )}
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
                          disabled={!replyState.draft.trim() || replyState.sending}
                          onClick={() => submitReply(c.id)}
                        >
                          {replyState.sending ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" /> Sending
                            </>
                          ) : (
                            <>
                              <Send className="size-3.5" /> Reply
                            </>
                          )}
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

function optimisticEmpty() {
  return { open: true, draft: '', items: [] as LocalReply[], sending: false };
}
