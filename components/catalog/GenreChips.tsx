import { Link } from '@/lib/navigation';

// Top genre quick-filter chips — horizontal scrollable row, sits right
// below the hero. Lets readers jump straight to the genre row they came
// for instead of having to scroll past everything. Each chip is 44px
// tall (Material guideline + 55+ accessibility research minimum).
//
// Styled as pills with subtle border so they read as taps even when a
// theme accent isn't applied. Active state would come from URL match —
// for now they always navigate to the genre page.

type Chip = { href: string; label: string; emoji?: string };

const CHIPS: Chip[] = [
  { href: '/genres/billionaire', label: 'Billionaire', emoji: '💼' },
  { href: '/genres/mafia', label: 'Mafia', emoji: '🌹' },
  { href: '/genres/forbidden', label: 'Forbidden', emoji: '🔒' },
  { href: '/genres/secret_baby', label: 'Secret Baby', emoji: '👶' },
  { href: '/genres/second_chance', label: 'Second Chance', emoji: '💞' },
  { href: '/genres/arranged', label: 'Arranged', emoji: '💍' },
  { href: '/genres/royal', label: 'Royal', emoji: '👑' },
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
            className="snap-start shrink-0 inline-flex items-center gap-2 h-11 px-4 rounded-full bg-bg-card border border-border text-[15px] font-medium text-text-soft hover:text-white hover:border-rose-bright/40 hover:bg-bg-elevated active:bg-bg-elevated transition-colors"
          >
            {chip.emoji && (
              <span className="text-base leading-none" aria-hidden>
                {chip.emoji}
              </span>
            )}
            <span>{chip.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
