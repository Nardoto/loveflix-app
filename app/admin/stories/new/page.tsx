import { authors as hardcodedAuthors } from '@/lib/data/authors';
import { createServiceClient } from '@/lib/supabase/server';
import { PageHead } from '@/components/admin/AdminUI';
import { NewStoryForm } from '@/components/admin/NewStoryForm';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function loadAuthors() {
  if (!SUPABASE_CONFIGURED) return hardcodedAuthors;
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from('authors')
      .select('id, name, tagline')
      .order('display_order', { ascending: true });
    if (!data || data.length === 0) return hardcodedAuthors;
    return data;
  } catch {
    return hardcodedAuthors;
  }
}

export default async function NewStoryPage() {
  const authors = await loadAuthors();
  return (
    <>
      <PageHead
        title="Nova story"
        subtitle="Sobe metadata, capa, vídeo e áudios — publica direto."
      />
      <NewStoryForm authors={authors.map((a) => ({ id: a.id, name: a.name, tagline: a.tagline }))} />
    </>
  );
}
