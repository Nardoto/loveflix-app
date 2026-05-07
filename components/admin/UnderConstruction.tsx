import { Wrench } from 'lucide-react';

// Friendly placeholder for admin routes that are mapped in the sidebar
// but not built yet. Beats a hard 404 — the operator knows the feature
// is on the roadmap and the menu entry isn't a dead link.
export function UnderConstruction({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="max-w-2xl py-10 text-center">
      <div className="size-12 mx-auto mb-4 rounded-2xl bg-white/[0.04] grid place-items-center text-text-dim">
        <Wrench className="size-5" />
      </div>
      <h2 className="font-serif italic font-black text-2xl text-white mb-2">
        {title}
      </h2>
      <p className="text-sm text-text-dim leading-relaxed max-w-md mx-auto">
        Em construção · próxima sprint.{hint ? ` ${hint}` : ''}
      </p>
    </div>
  );
}
