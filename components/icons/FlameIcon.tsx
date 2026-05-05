// Inline SVG flame — used for the HOT branding (badge, hero, /hot page).
// Inlined because lucide-react@1.14 doesn't ship every modern icon (we hit
// the same wall with Youtube earlier).
export function FlameIcon({
  className,
  flicker = false,
}: {
  className?: string;
  flicker?: boolean;
}) {
  return (
    <svg
      className={`${className ?? ''} ${flicker ? 'animate-flame-flicker' : ''}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2c.4 1.6.2 3.2-.5 4.6-.4.7-1 1.4-1.5 2.1-.6.8-1.1 1.6-1.4 2.5-.4-.6-.6-1.3-.7-2-.1-.4-.6-.5-.9-.2-1.6 1.6-2.6 3.7-2.6 6 0 4.7 3.7 8.5 8.4 8.5 4.7 0 8.6-3.7 8.6-8.4 0-3.5-2-6.9-4.5-9.3C15.5 4.4 13.7 3.1 12 2zm-.4 17.4c-1.8 0-3.3-1.4-3.3-3.2 0-.9.4-1.7 1-2.3.2.7.5 1.4.9 2 .3.4.9.4 1.2 0 .8-1 1.2-2.2 1.2-3.4 1.4 1 2.3 2.6 2.3 4.4 0 1.4-1.4 2.5-3.3 2.5z" />
    </svg>
  );
}
