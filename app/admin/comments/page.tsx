import { createServiceClient } from '@/lib/supabase/server';
import { PageHead, EmptyState } from '@/components/admin/AdminUI';
import { CommentsModerationList } from '@/components/admin/CommentsModerationList';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

type CommentRow = {
  id: string;
  story_slug: string;
  body: string;
  stars: number | null;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
  likes_count: number;
  replies_count: number;
};

async function loadComments(): Promise<CommentRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  try {
    const sb = createServiceClient();
    // story_comments_with_counts is a view defined in 0002_comments.sql that
    // pre-joins comment_user_meta + likes/replies counts in one query.
    const { data, error } = await sb
      .from('story_comments_with_counts')
      .select(
        'id, story_slug, body, stars, created_at, display_name, avatar_url, likes_count, replies_count',
      )
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Failed to load comments for admin:', error);
      return [];
    }
    return (data as unknown as CommentRow[]) ?? [];
  } catch (e) {
    console.error('Admin comments query crashed:', e);
    return [];
  }
}

export default async function AdminCommentsPage() {
  const comments = await loadComments();

  return (
    <>
      <PageHead
        title="Comentários"
        subtitle={
          comments.length > 0
            ? `${comments.length} no total · mais novos primeiro`
            : SUPABASE_CONFIGURED
            ? 'Nenhum comentário real ainda — usuários só interagem após o primeiro post.'
            : 'Configure as variáveis Supabase para ver atividade real.'
        }
      />

      {comments.length === 0 ? (
        <EmptyState
          title="Nada pra moderar (ainda)"
          desc={
            SUPABASE_CONFIGURED
              ? 'Comentários reais aparecem aqui assim que usuários começarem a postar.'
              : 'Defina NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY e rode a migration 0002_comments.sql.'
          }
        />
      ) : (
        <CommentsModerationList comments={comments} />
      )}
    </>
  );
}
