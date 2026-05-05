import { Link } from '@/lib/navigation';

// Top genre quick-filter chips — horizontal scrollable row, sits right
// below the hero. Lets readers jump straight to the genre row they came
// for instead of having to scroll past everything. Each chip is 44px
// tall (Material guideline + 55+ accessibility research minimum).
//
// Text-only by design. Disney+, Netflix, Apple TV+ all skip emoji on
// genre filters — emoji glyphs read as childish/stock and clash with the
// editorial AllureTV palette.

type Chip = { href: string; label: string };

const CHIPS: Chip[] = [
  { href: '/genres/billionaire', label: 'Billionaire' },
  { href: '/genres/mafia', label: 'Mafia' },
  { href: '/genres/forbidden', label: 'Forbidden' },
  { href: '/genres/secret_baby', label: 'Secret Baby' },
  { href: '/genres/second_chance', label: 'Second Chance' },
  { href: '/genres/arranged', label: 'Arranged' },
  { href: '/genres/royal', label: 'Royal' },
];

export function GenreChips() {
  return (
    <nav
      aria-label="Genres"
      className="px-4 md:px-10 mt-6 md:mt-8 -mb-2 md:mb-0"
    >
      <div className="row-track flex gap-2 overflow-x-auto -mx-4 md:-mx-10 px-4 md:px-10 snap-x snap-proximity">
        {CHIPS.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href as never}
            className="snap-start shrink-0 inline-flex items-center h-11 px-5 rounded-full bg-bg-card border border-border text-[15px] font-medium tracking-wide text-text-soft hover:text-white hover:border-rose-bright/40 hover:bg-bg-elevated active:bg-bg-elevated transition-colors"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
