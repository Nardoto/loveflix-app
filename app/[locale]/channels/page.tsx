import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { ChevronRight, Headphones } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { authors, filterByAuthor } from '@/lib/data/authors';
import { allStories } from '@/lib/data/stories';
import { filterByLocale } from '@/lib/data/locale-filter';

export default async function ChannelsIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const localeAll = filterByLocale(allStories, locale);

  return (
    <div className="pt-24 md:pt-28 px-5 md:px-10 lg:px-14 max-w-6xl mx-auto pb-20">
      <header className="mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold-bright mb-2">
          Channels
        </p>
        <h1 className="font-serif italic text-3xl md:text-5xl font-black text-white mb-3">
          Meet our storytellers
        </h1>
        <p className="text-text-dim text-base md:text-lg max-w-2xl">
          Each channel is a creator with their own romance world — from German Liebesgeschichten to dark mafia thrillers.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
        {authors.map((a) => {
          const count = filterByAuthor(localeAll, a.id).length;
          return (
            <Link
              key={a.id}
              href={`/channels/${a.id}` as never}
              className="group relative overflow-hidden rounded-3xl shadow-2xl shadow-black/50 hover:shadow-rose/20 transition-all"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${a.color} opacity-90`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="relative p-6 md:p-8 min-h-[260px] flex flex-col justify-end">
                <div
                  className={`relative size-14 md:size-16 rounded-full overflow-hidden bg-gradient-to-br ${a.color} shadow-xl shadow-black/40 mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Image
                    src={a.avatar}
                    alt={a.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70 mb-1">
                  {a.tagline}
                </p>
                <h2 className="font-serif italic font-black text-2xl md:text-3xl text-white mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                  {a.name}
                </h2>
                <p className="text-sm text-white/85 mb-4 max-w-md">{a.bio}</p>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90">
                    <Headphones className="size-4" />
                    {count} stories
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-white group-hover:translate-x-1 transition-transform">
                    Visit channel <ChevronRight className="size-4" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
