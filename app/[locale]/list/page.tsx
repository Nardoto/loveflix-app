import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Heart } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { StoryCard } from '@/components/catalog/StoryCard';
import { getUser } from '@/lib/auth-helpers';
import { getFavoritesForUser } from '@/lib/data/favorites-server';

// Lista pessoal — fresca a cada visita. unstable_cache não vale a pena
// per-user; o write path (revalidateTag) já invalida quando favorita.
export const dynamic = 'force-dynamic';

type Filter = 'all' | 'video' | 'ebook' | 'soon';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'video', label: 'Com vídeo' },
  { id: 'ebook', label: 'Com ebook' },
  { id: 'soon', label: 'Coming Soon' },
];

export default async function MyListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter: rawFilter } = await searchParams;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) {
    redirect(`/${locale}/login?returnTo=${encodeURIComponent(`/${locale}/list`)}`);
  }

  const allFavs = await getFavoritesForUser(user.id);
  const filter: Filter = (
    FILTERS.find((f) => f.id === rawFilter)?.id ?? 'all'
  ) as Filter;

  const filtered = allFavs.filter((s) => {
    if (filter === 'video') return !!(s.videoKey || s.videoSrc);
    if (filter === 'ebook') return !!(s.ebookKey || s.hasEbook);
    if (filter === 'soon') return !!s.isComingSoon;
    return true;
  });

  return (
    <div className="px-4 md:px-10 lg:px-14 pt-24 pb-20 max-w-[1400px] mx-auto">
      <header className="mb-8">
        <h1 className="font-serif italic font-black text-3xl md:text-5xl text-white tracking-tight mb-2">
          Minha Lista
        </h1>
        <p className="text-text-dim text-sm">
          {allFavs.length === 0
            ? 'Você ainda não salvou nenhuma story.'
            : `${allFavs.length} ${allFavs.length === 1 ? 'salva' : 'salvas'}`}
        </p>
      </header>

      {allFavs.length > 0 && (
        <nav className="flex gap-2 flex-wrap mb-8">
          {FILTERS.map((f) => {
            const active = f.id === filter;
            return (
              <Link
                key={f.id}
                href={(f.id === 'all' ? '/list' : `/list?filter=${f.id}`) as never}
                className={[
                  'px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors',
                  active
                    ? 'bg-rose text-white'
                    : 'bg-bg-card text-text-dim hover:text-white border border-white/[0.06]',
                ].join(' ')}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>
      )}

      {filtered.length === 0 ? (
        <EmptyState hasAny={allFavs.length > 0} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {filtered.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="rounded-2xl bg-bg-card border border-white/[0.06] p-12 text-center">
      <div className="size-14 mx-auto rounded-full bg-rose/15 grid place-items-center text-rose-bright mb-4">
        <Heart className="size-6" />
      </div>
      <h2 className="font-serif italic text-xl text-white mb-2">
        {hasAny ? 'Nada nesse filtro' : 'Sua lista está vazia'}
      </h2>
      <p className="text-text-dim text-sm max-w-sm mx-auto">
        {hasAny
          ? 'Tenta outro filtro acima ou volta na home pra adicionar mais.'
          : 'Toca no + de qualquer story pra salvar aqui. As que tiverem PDF, você pode baixar.'}
      </p>
      <Link
        href={'/' as never}
        className="inline-flex mt-6 px-5 py-2.5 rounded-full bg-rose text-white text-sm font-bold hover:bg-rose-bright transition-colors"
      >
        Explorar stories
      </Link>
    </div>
  );
}
