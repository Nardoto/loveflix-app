import { ReactNode } from 'react';

export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="pt-24 md:pt-28 px-5 md:px-10 lg:px-14 max-w-3xl mx-auto pb-20">
      <header className="mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-text-mute">
          Legal
        </p>
        <h1 className="font-serif italic text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-2">
          {title}
        </h1>
        <p className="text-sm text-text-dim mt-3">
          Last updated: <span className="text-text-soft">{lastUpdated}</span>
        </p>
      </header>

      <article
        className={[
          'prose prose-invert max-w-none',
          // Headings
          '[&_h2]:font-serif [&_h2]:italic [&_h2]:text-2xl [&_h2]:md:text-3xl',
          '[&_h2]:font-bold [&_h2]:text-rose-bright [&_h2]:mt-10 [&_h2]:mb-4',
          '[&_h3]:font-bold [&_h3]:text-white [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2',
          // Paragraphs + lists
          '[&_p]:text-text-soft/95 [&_p]:leading-relaxed [&_p]:mb-4',
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-2',
          '[&_li]:text-text-soft/95 [&_li]:leading-relaxed',
          // Inline + emphasis
          '[&_strong]:text-white [&_strong]:font-bold',
          '[&_a]:text-rose-bright [&_a]:underline [&_a]:hover:text-rose',
          // Card emphasis
          '[&_.callout]:bg-bg-elevated [&_.callout]:rounded-xl [&_.callout]:p-5',
          '[&_.callout]:border [&_.callout]:border-rose/15 [&_.callout]:my-6',
          '[&_.callout]:text-sm',
        ].join(' ')}
      >
        {children}
      </article>
    </div>
  );
}
