'use client';

// Galeria de imagens ilustrativas do ebook. Admin sobe N imagens
// numeradas 1..N; a numeração casa com a sintaxe {{img N}} usada no
// roteiro markdown.
//
// MVP: adicionar e remover. Drag-drop pra reordenar fica pra uma
// próxima iteração (precisa de S3 CopyObject + atualizações em massa
// no R2; complexo o suficiente pra justificar um bloco separado).

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Loader2, ImageIcon, X } from 'lucide-react';
import { useMultipartUpload } from '@/lib/upload/useMultipartUpload';
import { Button } from '@/components/ui/button';
import { setEbookImageCount, removeEbookImage } from '@/app/actions/scripts';

type Props = {
  slug: string;
  /** URL pública (com token assinado) das imagens já existentes, em ordem 1..N. */
  initialImageUrls: string[];
};

export function EbookImageGallery({ slug, initialImageUrls }: Props) {
  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls);
  const [pendingAdd, setPendingAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = useMultipartUpload();

  const handleAdd = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPendingAdd(true);
    const nextIndex = imageUrls.length; // 0-based pro pipeline; UI mostra 1-based.
    const key = await upload.start({
      storySlug: slug,
      bookNumber: 1,
      kind: 'ebook-image',
      file,
      filename: file.name,
      pageIndex: nextIndex,
    });
    if (!key) {
      setError(upload.error ?? 'Falha no upload');
      setPendingAdd(false);
      return;
    }
    const newCount = imageUrls.length + 1;
    const res = await setEbookImageCount(slug, newCount);
    if (!res.ok) {
      setError(res.error);
      setPendingAdd(false);
      return;
    }
    // Otimista: gera uma URL local via createObjectURL pra preview enquanto
    // o token assinado real vem no próximo render do server. Como o
    // server-side render é por demanda, ele virá fresco na próxima visita.
    setImageUrls((prev) => [...prev, URL.createObjectURL(file)]);
    setPendingAdd(false);
  };

  const handleRemove = async (idx1based: number) => {
    if (!confirm(`Remover a imagem #${idx1based}? Os numeros vão se ajustar.`)) return;
    setError(null);
    const res = await removeEbookImage(slug, idx1based);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setImageUrls((prev) => prev.filter((_, i) => i !== idx1based - 1));
  };

  const isUploading =
    upload.status === 'requesting' ||
    upload.status === 'uploading' ||
    upload.status === 'completing' ||
    pendingAdd;

  return (
    <section className="rounded-2xl bg-bg-card border border-white/[0.06] p-5">
      <header className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-mute">
            Ilustrações
          </h3>
          <p className="text-[12px] text-text-dim mt-1">
            Pra inserir uma imagem no roteiro, escreva{' '}
            <code className="px-1.5 py-0.5 rounded bg-bg-deep text-rose-bright font-mono text-[11px]">
              {'{{img N}}'}
            </code>{' '}
            numa linha sozinha (N é o número desta lista).
          </p>
        </div>
        <span className="text-[11px] text-text-mute shrink-0">
          {imageUrls.length} {imageUrls.length === 1 ? 'imagem' : 'imagens'}
        </span>
      </header>

      {error && (
        <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-[12px] text-red-300 flex items-start justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-red-300 hover:text-red-200"
            aria-label="Fechar"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {imageUrls.map((url, i) => (
          <div
            key={i}
            className="group relative aspect-video rounded-lg overflow-hidden bg-bg-deep ring-1 ring-white/10"
          >
            <Image src={url} alt="" fill sizes="200px" className="object-cover" unoptimized />
            <div className="absolute top-1.5 left-1.5 size-6 rounded-full bg-rose text-white text-[11px] font-bold grid place-items-center shadow">
              {i + 1}
            </div>
            <button
              type="button"
              aria-label={`Remover imagem ${i + 1}`}
              onClick={() => handleRemove(i + 1)}
              className="absolute top-1.5 right-1.5 size-7 rounded-full bg-black/70 hover:bg-red-500/90 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}

        {/* Slot de adicionar */}
        <label
          className={[
            'aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-text-mute hover:text-rose-bright hover:border-rose-bright/50 hover:bg-rose/[0.04] cursor-pointer transition-colors',
            isUploading ? 'border-rose-bright/40 bg-rose/[0.04] text-rose-bright cursor-wait' : 'border-white/[0.10]',
          ].join(' ')}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isUploading}
            onChange={(e) => handleAdd(e.target.files?.[0])}
          />
          {isUploading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              <span className="text-[11px] font-bold">
                {upload.status === 'uploading'
                  ? `${Math.round(upload.progress * 100)}%`
                  : 'Enviando…'}
              </span>
            </>
          ) : (
            <>
              <ImageIcon className="size-5" />
              <span className="text-[11px] font-bold inline-flex items-center gap-1">
                <Plus className="size-3" /> Adicionar
              </span>
            </>
          )}
        </label>
      </div>

      {imageUrls.length === 0 && !isUploading && (
        <p className="text-[12px] text-text-mute mt-4">
          Nenhuma imagem ainda. Adicione pelo menos uma pra usar no roteiro.
        </p>
      )}
    </section>
  );
}
