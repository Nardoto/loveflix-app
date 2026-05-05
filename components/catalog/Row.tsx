'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StoryCard } from './StoryCard';
import type { Story } from '@/lib/data/stories';

type RowProps = {
  title: string;
  highlight?: string; // word inside title to render in italic rose
  stories: Story[];
  numbered?: boolean;
};

export function Row({ title, highlight, stories, numbered = false }: RowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (!stories.length) return null;

  // Render title with optional highlighted word
  const renderTitle = () => {
    if (!highlight) return <>{title}</>;
    const idx = title.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx < 0) return <>{title}</>;
    return (
      <>
        {title.slice(0, idx)}
        <em className="text-rose not-italic font-serif italic">
          {title.slice(idx, idx + highlight.length)}
        </em>
        {title.slice(idx + highlight.length)}
      </>
    );
  };

  return (
    <section className="group relative px-4 md:px-10 mt-10 md:mt-14">
      <div className="mb-3 md:mb-4">
        <h2 className="font-serif text-xl md:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-none">
          {renderTitle()}
        </h2>
        <span className="gold-flourish" aria-hidden="true" />
      </div>

      <div className="relative">
        <div
          ref={trackRef}
          className="row-track flex gap-2.5 md:gap-3 overflow-x-auto -mx-4 md:-mx-10 px-4 md:px-10 snap-x snap-mandatory scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {stories.map((story, i) => (
            <StoryCard
              key={story.id + '-' + i}
              story={story}
              rank={numbered ? i + 1 : undefined}
            />
          ))}
        </div>

        {/* Side arrows — desktop only, fade in on hover */}
        {canScrollLeft && (
          <button
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 size-12 lg:size-14 items-center justify-center text-white/0 hover:text-rose hover:scale-110 group-hover:text-white/80 transition-all bg-gradient-to-r from-bg-deep to-transparent z-10 rounded-r-2xl"
          >
            <ChevronLeft className="size-8 lg:size-10" strokeWidth={2.4} />
          </button>
        )}
        {canScrollRight && (
          <button
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 size-12 lg:size-14 items-center justify-center text-white/0 hover:text-rose hover:scale-110 group-hover:text-white/80 transition-all bg-gradient-to-l from-bg-deep to-transparent z-10 rounded-l-2xl"
          >
            <ChevronRight className="size-8 lg:size-10" strokeWidth={2.4} />
          </button>
        )}
      </div>
    </section>
  );
}
