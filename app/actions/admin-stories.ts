'use server';

// Admin-only Server Actions for the stories catalog. All re-check
// requireAdmin() — Server Actions are addressable URLs, never trust the
// layout gate alone.
//
// Cache invalidation: every mutation calls revalidateTag('stories') so
// the unstable_cache wrapper in lib/data/stories-server.ts re-runs the
// Supabase query on the next render. The home, /hot, and /admin/stories
// all hit that single tag.

import { revalidateTag, revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth-helpers';
import { createServiceClient } from '@/lib/supabase/server';
import { deleteObject, publicMediaUrl } from '@/lib/r2';

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const SLUG_RE = /^[a-z0-9-]+$/;

/** Translate a Zod validation error into something an operator can act on. */
function humanZod(err: z.ZodError): string {
  const FIELD_LABEL: Record<string, string> = {
    title: 'Título',
    slug: 'URL (slug)',
    synopsis: 'Sinopse',
    genre: 'Gênero',
    authorId: 'Canal/Autor',
    totalMinutes: 'Duração',
    coverKey: 'Capa',
    videoKey: 'Vídeo',
    ebookKey: 'Ebook',
    audioKeyByLocale: 'Áudio',
  };
  const lines = err.issues.map((i) => {
    const top = i.path[0]?.toString() ?? '';
    const label = FIELD_LABEL[top] ?? top;
    if (top === 'audioKeyByLocale') {
      const locale = i.path[1]?.toString().toUpperCase() ?? '';
      return `Áudio ${locale}: arquivo inválido (re-suba ou remova)`;
    }
    if (i.code === 'too_small') return `${label}: muito curto`;
    if (i.code === 'too_big') return `${label}: muito longo`;
    if (i.code === 'invalid_format') return `${label}: formato inválido`;
    if (i.code === 'invalid_type') return `${label}: campo obrigatório`;
    if (i.code === 'invalid_value') return `${label}: valor não permitido`;
    return `${label}: ${i.message}`;
  });
  // Dedup
  return Array.from(new Set(lines)).join(' · ');
}

const GenreEnum = z.enum([
  'mafia',
  'billionaire',
  'forbidden',
  'secret_baby',
  'second_chance',
  'arranged',
  'royal',
  'mood',
]);

const CreateInput = z.object({
  // The form generates the slug client-side from the title; we still
  // validate it here.
  slug: z.string().min(3).max(120).regex(SLUG_RE, 'slug must be a-z 0-9 -'),
  title: z.string().min(3).max(280),
  synopsis: z.string().min(10).max(4000),
  /** Tag principal — usada como categoria visual primária. */
  genre: GenreEnum,
  /**
   * Array completo de tags (inclui o primário). Permite N gêneros por
   * story. Se omitido, o servidor monta `[genre]`. Cap em 5 pra evitar
   * abuso. Validação extra checa inclusão do primário.
   */
  genres: z.array(GenreEnum).min(1).max(5).optional(),
  tropes: z.array(z.string().min(1).max(60)).max(20).default([]),
  authorId: z.string().min(1).optional(),
  totalMinutes: z.number().int().min(1).max(600).default(45),
  ageRating: z.string().default('18+'),
  isFree: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  isHot: z.boolean().default(false),
  isComingSoon: z.boolean().default(false),
  hasEbook: z.boolean().default(false),
  // R2 keys produced by the upload pipeline. coverKey is required to
  // create a publishable story; videoKey is optional (a draft can ship
  // without a video and be flagged Coming Soon).
  coverKey: z.string().min(1),
  videoKey: z.string().optional(),
  ebookKey: z.string().optional(),
  // Locale → R2 key. Empty when the title is text-only / coming-soon.
  // Zod v4: z.record(enum, value) is EXHAUSTIVE — exige todas as chaves
  // do enum. Pra aceitar parcial (só EN, ou só DE, etc.) precisa de
  // partialRecord.
  audioKeyByLocale: z
    .partialRecord(z.enum(['en', 'de', 'fr', 'es']), z.string().min(1))
    .optional(),
  // Quando o wizard de criação já subiu imagens da galeria de ebook
  // (uploads vão diretos pro R2 antes do submit), o caller informa
  // quantas — o server propaga pra stories.ebook_image_count.
  ebookImageCount: z.number().int().min(0).max(500).optional(),
  // Roteiro markdown por idioma. Vazio = sem roteiro pra aquele idioma.
  // O server faz upsert em story_scripts apenas pras locales preenchidas.
  scripts: z
    .partialRecord(z.enum(['en', 'de', 'fr', 'es']), z.string().max(250_000))
    .optional(),
});

export type CreateStoryInput = z.input<typeof CreateInput>;

export async function createStory(
  raw: CreateStoryInput,
): Promise<Result<{ slug: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: 'Forbidden' };

  const parsed = CreateInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: humanZod(parsed.error) };
  }
  const v = parsed.data;

  const sb = createServiceClient();

  // Generate a stable, sortable id (uuid-ish) so seeding doesn't collide
  // with hardcoded numeric ids.
  const id = `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // genres array: usa o que o form mandou, ou monta a partir do singular.
  // Garante que o primário esteja na lista (se cliente esquecer) e dedup.
  const genresArr = Array.from(
    new Set<string>([v.genre, ...(v.genres ?? [])]),
  );

  // Filtra scripts: só conta as locales que vieram com conteúdo não-vazio.
  const nonEmptyScripts = Object.entries(v.scripts ?? {}).filter(
    ([, content]) => (content ?? '').trim().length > 0,
  );
  const imageCount = v.ebookImageCount ?? 0;
  // has_ebook é true se: admin marcou o toggle, ou subiu PDF, ou subiu
  // imagens da galeria, ou escreveu pelo menos 1 script.
  const computedHasEbook =
    v.hasEbook || !!v.ebookKey || imageCount > 0 || nonEmptyScripts.length > 0;

  const insertRow = {
    id,
    slug: v.slug,
    title: v.title,
    cover: publicMediaUrl(v.coverKey),
    cover_key: v.coverKey,
    genre: v.genre,
    genres: genresArr,
    tropes: v.tropes,
    synopsis: v.synopsis,
    is_free: v.isFree,
    is_premium: v.isPremium,
    is_hot: v.isHot,
    is_coming_soon: v.isComingSoon,
    age_rating: v.ageRating,
    total_minutes: v.totalMinutes,
    has_ebook: computedHasEbook,
    video_key: v.videoKey ?? null,
    ebook_key: v.ebookKey ?? null,
    ebook_image_count: imageCount,
    author_id: v.authorId ?? null,
    published_at: v.isComingSoon ? null : new Date().toISOString(),
  };

  const { error } = await sb.from('stories').insert(insertRow);
  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Já existe uma story com esse slug.' };
    }
    return { ok: false, error: error.message };
  }

  // Per-locale audio rows (only the locales actually uploaded).
  const audioRows = Object.entries(v.audioKeyByLocale ?? {}).map(([locale, key]) => ({
    story_id: id,
    locale,
    audio_key: key,
  }));
  if (audioRows.length) {
    const { error: aErr } = await sb.from('story_audio').insert(audioRows);
    if (aErr) {
      // Non-fatal: the story is created; the operator can retry uploading
      // audio from the edit page. Surface the warning anyway.
      return { ok: false, error: `Story criada, mas áudios falharam: ${aErr.message}` };
    }
  }

  // Scripts por idioma (story_scripts). Upsert pra cada locale preenchida.
  // Mesma lógica do updateStoryScript em scripts.ts: word_count derivado,
  // RLS service_role escreve sem problema.
  if (nonEmptyScripts.length) {
    const scriptRows = nonEmptyScripts.map(([locale, content]) => {
      const text = content as string;
      const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
      return {
        story_id: id,
        locale,
        content: text,
        word_count: wordCount,
      };
    });
    const { error: sErr } = await sb
      .from('story_scripts')
      .upsert(scriptRows, { onConflict: 'story_id,locale' });
    if (sErr) {
      // Non-fatal igual aos áudios — operador pode reescrever no editor.
      return {
        ok: false,
        error: `Story criada, mas roteiros falharam: ${sErr.message}`,
      };
    }
  }

  // expire: 0 = invalida AGORA (não SWR). Operator que acabou de
  // publicar precisa ver o resultado na próxima navegação, não daqui
  // a uns segundos. 'max' (stale-while-revalidate) servia o conteúdo
  // antigo na primeira visita e era o que fazia o usuário pensar que
  // o upload não tinha funcionado.
  revalidateTag('stories', { expire: 0 });
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/stories');
  return { ok: true, data: { slug: v.slug } };
}

const UpdateInput = CreateInput.partial().extend({
  slug: z.string().min(3).max(120).regex(SLUG_RE),
});

export type UpdateStoryInput = z.input<typeof UpdateInput>;

export async function updateStory(
  storySlug: string,
  raw: UpdateStoryInput,
): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: 'Forbidden' };

  const parsed = UpdateInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: humanZod(parsed.error) };
  }
  const v = parsed.data;

  const sb = createServiceClient();
  const update: Record<string, unknown> = {};
  if (v.title !== undefined) update.title = v.title;
  if (v.synopsis !== undefined) update.synopsis = v.synopsis;
  if (v.genre !== undefined) update.genre = v.genre;
  // genres array: cliente pode mandar a lista completa. Se mandou só
  // o singular, monta `[genre]` no banco pra manter o array sincronizado.
  if (v.genres !== undefined) {
    const primary = v.genre ?? v.genres[0];
    update.genres = Array.from(new Set<string>([primary, ...v.genres]));
  } else if (v.genre !== undefined) {
    update.genres = [v.genre];
  }
  if (v.tropes !== undefined) update.tropes = v.tropes;
  if (v.authorId !== undefined) update.author_id = v.authorId;
  if (v.totalMinutes !== undefined) update.total_minutes = v.totalMinutes;
  if (v.ageRating !== undefined) update.age_rating = v.ageRating;
  if (v.isFree !== undefined) update.is_free = v.isFree;
  if (v.isPremium !== undefined) update.is_premium = v.isPremium;
  if (v.isHot !== undefined) update.is_hot = v.isHot;
  if (v.isComingSoon !== undefined) {
    update.is_coming_soon = v.isComingSoon;
    update.published_at = v.isComingSoon ? null : new Date().toISOString();
  }
  if (v.hasEbook !== undefined) update.has_ebook = v.hasEbook;
  if (v.coverKey !== undefined) {
    update.cover_key = v.coverKey;
    update.cover = publicMediaUrl(v.coverKey);
  }
  if (v.videoKey !== undefined) update.video_key = v.videoKey;
  if (v.ebookKey !== undefined) {
    update.ebook_key = v.ebookKey;
    // Subiu o PDF, acende o flag se ainda estava off — sem sobrescrever
    // o toggle quando o admin removeu o PDF (só reseta ao deletar a story).
    if (v.ebookKey) update.has_ebook = true;
  }
  if (v.slug !== storySlug && v.slug !== undefined) update.slug = v.slug;

  const { error } = await sb.from('stories').update(update).eq('slug', storySlug);
  if (error) return { ok: false, error: error.message };

  // Audio: replace the locale rows wholesale when the operator submits
  // them. (Edit page sends a complete map of the locales they want kept.)
  if (v.audioKeyByLocale) {
    const { data: storyRow } = await sb
      .from('stories')
      .select('id')
      .eq('slug', v.slug ?? storySlug)
      .single();
    if (storyRow?.id) {
      await sb.from('story_audio').delete().eq('story_id', storyRow.id);
      const rows = Object.entries(v.audioKeyByLocale).map(([locale, key]) => ({
        story_id: storyRow.id,
        locale,
        audio_key: key,
      }));
      if (rows.length) {
        const { error: aErr } = await sb.from('story_audio').insert(rows);
        if (aErr) return { ok: false, error: aErr.message };
      }
    }
  }

  // expire: 0 = invalida AGORA (não SWR). Operator que acabou de
  // publicar precisa ver o resultado na próxima navegação, não daqui
  // a uns segundos. 'max' (stale-while-revalidate) servia o conteúdo
  // antigo na primeira visita e era o que fazia o usuário pensar que
  // o upload não tinha funcionado.
  revalidateTag('stories', { expire: 0 });
  revalidatePath('/');
  revalidatePath(`/s/${v.slug ?? storySlug}`);
  revalidatePath('/admin/stories');
  return { ok: true };
}

export async function deleteStory(storySlug: string): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: 'Forbidden' };

  const sb = createServiceClient();
  // Pull keys first so we can clean up R2 objects after the row is gone.
  const { data: story } = await sb
    .from('stories')
    .select('id, cover_key, video_key, ebook_key, story_audio(audio_key)')
    .eq('slug', storySlug)
    .single();

  if (!story) return { ok: false, error: 'Story não encontrada' };

  const { error } = await sb.from('stories').delete().eq('id', story.id);
  if (error) return { ok: false, error: error.message };

  // Best-effort cleanup of R2 — failures don't roll back the DB delete.
  const keys: string[] = [];
  if (story.cover_key) keys.push(story.cover_key);
  if (story.video_key) keys.push(story.video_key);
  if (story.ebook_key) keys.push(story.ebook_key);
  for (const a of (story.story_audio ?? []) as Array<{ audio_key: string | null }>) {
    if (a.audio_key) keys.push(a.audio_key);
  }
  await Promise.all(
    keys.map((k) => deleteObject(k).catch(() => undefined)),
  );

  // expire: 0 = invalida AGORA (não SWR). Operator que acabou de
  // publicar precisa ver o resultado na próxima navegação, não daqui
  // a uns segundos. 'max' (stale-while-revalidate) servia o conteúdo
  // antigo na primeira visita e era o que fazia o usuário pensar que
  // o upload não tinha funcionado.
  revalidateTag('stories', { expire: 0 });
  revalidatePath('/');
  revalidatePath('/admin/stories');
  return { ok: true };
}

export async function publishStory(storySlug: string): Promise<Result> {
  return updateStory(storySlug, {
    slug: storySlug,
    isComingSoon: false,
  });
}

export async function unpublishStory(storySlug: string): Promise<Result> {
  return updateStory(storySlug, {
    slug: storySlug,
    isComingSoon: true,
  });
}

// =====================================================================
// Bulk actions — operadora seleciona N stories na lista e aplica em massa
// =====================================================================

const BulkInput = z.object({
  slugs: z.array(z.string().min(1).regex(SLUG_RE)).min(1).max(200),
});

export async function bulkPublish(slugs: string[]): Promise<Result<{ count: number }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: 'Forbidden' };
  const parsed = BulkInput.safeParse({ slugs });
  if (!parsed.success) return { ok: false, error: 'Lista inválida' };

  const sb = createServiceClient();
  const { error, count } = await sb
    .from('stories')
    .update({
      is_coming_soon: false,
      published_at: new Date().toISOString(),
    }, { count: 'exact' })
    .in('slug', parsed.data.slugs);
  if (error) return { ok: false, error: error.message };

  revalidateTag('stories', { expire: 0 });
  revalidatePath('/');
  revalidatePath('/admin/stories');
  return { ok: true, data: { count: count ?? 0 } };
}

export async function bulkUnpublish(slugs: string[]): Promise<Result<{ count: number }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: 'Forbidden' };
  const parsed = BulkInput.safeParse({ slugs });
  if (!parsed.success) return { ok: false, error: 'Lista inválida' };

  const sb = createServiceClient();
  const { error, count } = await sb
    .from('stories')
    .update({
      is_coming_soon: true,
      published_at: null,
    }, { count: 'exact' })
    .in('slug', parsed.data.slugs);
  if (error) return { ok: false, error: error.message };

  revalidateTag('stories', { expire: 0 });
  revalidatePath('/');
  revalidatePath('/admin/stories');
  return { ok: true, data: { count: count ?? 0 } };
}

export async function bulkDelete(slugs: string[]): Promise<Result<{ count: number }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: 'Forbidden' };
  const parsed = BulkInput.safeParse({ slugs });
  if (!parsed.success) return { ok: false, error: 'Lista inválida' };

  // Itera chamando deleteStory pra reaproveitar a limpeza R2 (cover, video,
  // ebook, audios). Pra 200 stories isso dá no máx 200 deletes em série —
  // aceitável pra ação manual; se virar gargalo, paraleliza com Promise.all.
  let count = 0;
  for (const slug of parsed.data.slugs) {
    const r = await deleteStory(slug);
    if (r.ok) count += 1;
  }
  return { ok: true, data: { count } };
}
