import Image from 'next/image';
import { Star } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { authors, type Author } from '@/lib/data/authors';
import { cn } from '@/lib/utils';

type Props = {
  /** Author id to highlight as selected — undefined means "For You" is active. */
  currentChannel?: string;
};

export function AuthorPills({ currentChannel }: Props) {
  return (
    <div className="row-track flex items-center gap-2 overflow-x-auto px-4 md:px-10 py-4">
      <Pill
        href="/"
        isSelected={!currentChannel}
        icon={<Star className="size-3.5 fill-current" />}
        label="For You"
      />
      {authors.map((a) => (
        <AuthorPill
          key={a.id}
          author={a}
          isSelected={currentChannel === a.id}
        />
      ))}
    </div>
  );
}

function Pill({
  href,
  isSelected,
  icon,
  label,
}: {
  href: string;
  isSelected: boolean;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href as never}
      className={cn(
        'inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all',
        isSelected
          ? 'bg-white text-black shadow-lg'
          : 'bg-white/5 text-text-soft hover:bg-white/10',
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function AuthorPill({
  author,
  isSelected,
}: {
  author: Author;
  isSelected: boolean;
}) {
  return (
    <Link
      href={`/channels/${author.id}` as never}
      title={author.bio}
      className={cn(
        'inline-flex items-center gap-2 h-10 pl-1 pr-4 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all',
        isSelected ? 'bg-white/15' : 'bg-white/5 hover:bg-white/10',
      )}
    >
      <span
        className={cn(
          'relative size-8 rounded-full overflow-hidden shadow-md bg-gradient-to-br',
          author.color,
        )}
      >
        <Image
          src={author.avatar}
          alt={author.name}
          fill
          sizes="32px"
          className="object-cover"
        />
      </span>
      <span className={isSelected ? 'text-white' : 'text-text-soft'}>{author.name}</span>
    </Link>
  );
}
