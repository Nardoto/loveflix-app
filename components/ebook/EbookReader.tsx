'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Heart, X } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import type { EbookPage } from '@/lib/data/ebook';
import type { Story } from '@/lib/data/stories';
import { cn } from '@/lib/utils';

export function EbookReader({
  story,
  pages,
}: {
  story: Story;
  pages: EbookPage[];
}) {
  const [index, setIndex] = useState(0);
  const total = pages.length;
  const page = pages[index];

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') goPrev();
      else if (e.code === 'ArrowRight' || e.code === 'Space') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  // Reset scroll when page changes
  useEffect(() => {
    document.querySelector('.ebook-text')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [index]);

  const progress = ((index + 1) / total) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#1f1812] text-[#e8dac7] flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 h-14 px-4 md:px-6 flex items-center gap-3 bg-[#1a1410]/95 backdrop-blur-xl shadow-lg shadow-black/40">
        <Button asChild variant="ghost" size="icon" aria-label="Close ebook">
          <Link href={`/s/${story.slug}` as never}>
            <X />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#8a7560]">E-book</p>
          <p className="font-serif italic text-sm md:text-base truncate">{story.title}</p>
        </div>
        <span className="text-xs text-[#8a7560] tabular-nums shrink-0">
          {index + 1} / {total}
        </span>
      </header>

      {/* Page area */}
      <main className="flex-1 overflow-hidden flex items-center justify-center p-4 md:p-8">
        {page.type === 'cover' && (
          <div className="flex flex-col items-center text-center max-w-md animate-[fade-up_0.6s_ease]">
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden mb-6 shadow-2xl">
              <Image src={story.cover} alt={story.title} fill priority sizes="600px" className="object-cover" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-[#c9577a] mb-3">A Romance Novel</p>
            <h1 className="font-serif italic font-black text-3xl md:text-5xl mb-4 text-[#f5e9d6] leading-tight">
              {story.title}
            </h1>
            <p className="text-sm text-[#a89b85] mb-6 leading-relaxed max-w-sm">{story.synopsis}</p>
            <Button onClick={goNext} size="lg" variant="rose">
              Begin reading <ChevronRight />
            </Button>
          </div>
        )}

        {page.type === 'content' && (
          <div className="grid md:grid-cols-2 gap-6 lg:gap-12 max-w-6xl w-full h-full max-h-[calc(100vh-7rem)] animate-[fade-up_0.5s_ease]">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 hidden md:block">
              <Image src={page.img} alt="" fill sizes="50vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
            </div>
            <div className="ebook-text overflow-y-auto pr-2 md:pr-4">
              <div className="md:hidden mb-4 relative aspect-[16/9] rounded-xl overflow-hidden">
                <Image src={page.img} alt="" fill sizes="100vw" className="object-cover" />
              </div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-[#c9577a] mb-2">{page.chapter}</p>
              <h2 className="font-serif italic font-bold text-2xl md:text-3xl lg:text-4xl text-[#f5e9d6] leading-tight mb-6">
                {page.title}
              </h2>
              <div
                className="ebook-body font-serif text-base md:text-lg leading-[1.8] text-[#e8dac7] [&_p]:mb-4 [&_p:first-of-type::first-letter]:font-serif [&_p:first-of-type::first-letter]:text-5xl [&_p:first-of-type::first-letter]:font-bold [&_p:first-of-type::first-letter]:text-[#c9577a] [&_p:first-of-type::first-letter]:float-left [&_p:first-of-type::first-letter]:pr-2 [&_p:first-of-type::first-letter]:leading-none [&_em]:text-[#d4af6f] [&_em]:italic"
                dangerouslySetInnerHTML={{ __html: page.body }}
              />
            </div>
          </div>
        )}

        {page.type === 'final' && (
          <div className="text-center max-w-lg animate-[fade-up_0.6s_ease]">
            <Heart className="size-16 mx-auto text-[#c9577a] mb-6" strokeWidth={1.5} />
            <h2 className="font-serif italic font-black text-4xl md:text-5xl mb-6 text-[#f5e9d6]">
              {page.title}
            </h2>
            <div
              className="font-serif text-lg md:text-xl leading-[1.7] text-[#a89b85] [&_em]:text-[#c9577a]"
              dangerouslySetInnerHTML={{ __html: page.message }}
            />
            <Button asChild size="lg" variant="rose" className="mt-10">
              <Link href={`/s/${story.slug}` as never}>Back to story</Link>
            </Button>
          </div>
        )}
      </main>

      {/* Side arrows (desktop) */}
      <button
        onClick={goPrev}
        disabled={index === 0}
        aria-label="Previous page"
        className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 size-12 lg:size-14 items-center justify-center rounded-full text-[#e8dac7]/70 hover:text-[#c9577a] hover:scale-110 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="size-8" strokeWidth={2.4} />
      </button>
      <button
        onClick={goNext}
        disabled={index === total - 1}
        aria-label="Next page"
        className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 size-12 lg:size-14 items-center justify-center rounded-full text-[#e8dac7]/70 hover:text-[#c9577a] hover:scale-110 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight className="size-8" strokeWidth={2.4} />
      </button>

      {/* Bottom progress + mobile nav */}
      <footer className="shrink-0 h-14 md:h-16 px-4 md:px-6 flex items-center gap-3 bg-[#1a1410]/95 backdrop-blur-xl shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="md:hidden grid place-items-center size-10 rounded-full text-[#e8dac7]/70 disabled:opacity-30"
          aria-label="Previous"
        >
          <ChevronLeft />
        </button>

        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c9577a] to-[#e8a4b8] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-xs text-[#8a7560] tabular-nums shrink-0 hidden sm:block">
          {Math.round(progress)}%
        </span>

        <button
          onClick={goNext}
          disabled={index === total - 1}
          className="md:hidden grid place-items-center size-10 rounded-full text-[#e8dac7]/70 disabled:opacity-30"
          aria-label="Next"
        >
          <ChevronRight />
        </button>
      </footer>
    </div>
  );
}
