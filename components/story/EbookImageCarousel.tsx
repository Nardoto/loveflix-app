'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  imageUrls: string[];
  /** Intervalo em ms entre slides. Default 5s — confortável pra audiência 55+. */
  autoplayMs?: number;
};

export function EbookImageCarousel({ imageUrls, autoplayMs = 5000 }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = imageUrls.length;

  const goTo = useCallback(
    (next: number) => setIdx(((next % total) + total) % total),
    [total],
  );
  const prev = useCallback(() => goTo(idx - 1), [goTo, idx]);
  const next = useCallback(() => goTo(idx + 1), [goTo, idx]);

  useEffect(() => {
    if (total <= 1 || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % total), autoplayMs);
    return () => clearInterval(t);
  }, [total, paused, autoplayMs]);

  if (total === 0) return null;

  return (
    <div
      className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-bg-deep ring-1 ring-white/10 shadow-2xl shadow-black/40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {imageUrls.map((url, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0 }}
          aria-hidden={i !== idx}
        >
          <Image
            src={url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 1024px"
            className="object-cover"
            unoptimized
            priority={i === 0}
          />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Imagem anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-10 md:size-12 grid place-items-center rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-sm transition-colors"
          >
            <ChevronLeft className="size-5 md:size-6" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Próxima imagem"
            className="absolute right-3 top-1/2 -translate-y-1/2 size-10 md:size-12 grid place-items-center rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-sm transition-colors"
          >
            <ChevronRight className="size-5 md:size-6" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {imageUrls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir para imagem ${i + 1}`}
                className={[
                  'h-1.5 rounded-full transition-all',
                  i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75',
                ].join(' ')}
              />
            ))}
          </div>

          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-bold tabular-nums backdrop-blur-sm">
            {idx + 1} / {total}
          </div>
        </>
      )}
    </div>
  );
}
