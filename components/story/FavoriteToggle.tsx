'use client';

// Botões de "Adicionar à Lista". Dois sabores:
//   <FavoriteAddButton>: pill grande pra story detail (Plus / Check)
//   <FavoriteHeart>: ícone de coração pequeno no canto do StoryCard
//
// Ambos chamam as mesmas server actions; o `Heart` para a propagação do
// click pra não navegar pra story quando o usuário só quer favoritar.

import { useOptimistic, useTransition } from 'react';
import { Plus, Check, Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addFavorite, removeFavorite } from '@/app/actions/favorites';

type Props = {
  storySlug: string;
  initial: boolean;
  /** Se a usuária não está logada, redireciona pro login com returnTo. */
  loginReturnTo?: string;
};

function useToggle({ storySlug, initial, loginReturnTo }: Props) {
  const [isFav, setOptimistic] = useOptimistic(initial);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const next = !isFav;
      setOptimistic(next);
      const res = next
        ? await addFavorite(storySlug)
        : await removeFavorite(storySlug);
      if (!res.ok) {
        if (res.error === 'Não autenticado' && loginReturnTo) {
          window.location.href = `/login?returnTo=${encodeURIComponent(loginReturnTo)}`;
          return;
        }
        // Reverte otimista ao falhar.
        setOptimistic(!next);
      }
    });
  };

  return { isFav, pending, toggle };
}

export function FavoriteAddButton(props: Props) {
  const { isFav, pending, toggle } = useToggle(props);
  return (
    <Button
      variant="glass"
      size="icon"
      aria-label={isFav ? 'Remover da minha lista' : 'Adicionar à minha lista'}
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
 * Heart overlay pro StoryCard. Sempre visível em mobile; aparece on-hover
 * em desktop. stopPropagation para não navegar pra story ao clicar.
 */
export function FavoriteHeart(props: Props) {
  const { isFav, pending, toggle } = useToggle(props);
  return (
    <button
      type="button"
      aria-label={isFav ? 'Remover da minha lista' : 'Adicionar à minha lista'}
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
