'use client';

// Add-to-list buttons. Two variants:
//   <FavoriteAddButton>: pill on the story detail (Plus / Check)
//   <FavoriteHeart>: small heart on the StoryCard corner
//
// Originally used useOptimistic — but in this codebase the parent server
// component doesn't re-run on a server-action revalidate (the action just
// invalidates a tag), so useOptimistic snapped back to the stale `initial`
// after every click. Plain useState + router.refresh() is simpler and
// behaves the way the user expects.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Check, Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addFavorite, removeFavorite } from '@/app/actions/favorites';

type Props = {
  storySlug: string;
  initial: boolean;
  /** Where to send the user if they aren't logged in. */
  loginReturnTo?: string;
};

function useFavToggle({ storySlug, initial, loginReturnTo }: Props) {
  const [isFav, setIsFav] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = () => {
    const next = !isFav;
    // Optimistic: flip immediately so the click feels instant.
    setIsFav(next);
    startTransition(async () => {
      const res = next
        ? await addFavorite(storySlug)
        : await removeFavorite(storySlug);
      if (res.ok) {
        // Sync the rest of the page (e.g. /account preview, /list count).
        router.refresh();
        return;
      }
      if (res.error === 'Não autenticado' && loginReturnTo) {
        window.location.href = `/login?returnTo=${encodeURIComponent(loginReturnTo)}`;
        return;
      }
      // Diagnóstico temporário: surface o erro com alert pra capturar a
      // mensagem real do Postgres (a tabela favorites tá vazia em prod, o
      // que sugere que todo clique tá falhando silencioso). Quando achar a
      // causa, remover esse alert.
      if (typeof window !== 'undefined') {
        window.alert(`Falha ao salvar na lista: ${res.error}`);
      }
      // Revert the optimistic flip on real failures.
      setIsFav(!next);
    });
  };

  return { isFav, pending, toggle };
}

export function FavoriteAddButton(props: Props) {
  const t = useTranslations('myList');
  const { isFav, pending, toggle } = useFavToggle(props);
  return (
    <Button
      variant="glass"
      size="icon"
      aria-label={isFav ? t('removeAria') : t('addAria')}
      onClick={toggle}
      disabled={pending}
      className={isFav ? 'text-emerald-400 hover:text-emerald-300' : undefined}
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : isFav ? (
        <Check />
      ) : (
        <Plus />
      )}
    </Button>
  );
}

/**
 * Heart overlay for StoryCard. Always visible on mobile; hover on desktop.
 * stopPropagation prevents the wrapping Link from navigating on click.
 */
export function FavoriteHeart(props: Props) {
  const t = useTranslations('myList');
  const { isFav, pending, toggle } = useFavToggle(props);
  return (
    <button
      type="button"
      aria-label={isFav ? t('removeAria') : t('addAria')}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={pending}
      className={[
        'absolute top-2 right-2 z-10 size-9 rounded-full grid place-items-center backdrop-blur-md',
        'transition-all md:opacity-0 md:group-hover:opacity-100 opacity-100',
        isFav
          ? 'bg-rose text-white shadow-[0_2px_10px_rgba(255,77,126,0.6)] md:opacity-100'
          : 'bg-black/55 text-white hover:bg-black/75',
        pending ? 'cursor-wait' : 'cursor-pointer',
      ].join(' ')}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Heart className={`size-4 ${isFav ? 'fill-current' : ''}`} />
      )}
    </button>
  );
}
