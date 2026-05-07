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
    <div className="max-w-2xl rounded-3xl border border-gold/[0.20] bg-gradient-to-br from-gold/[0.05] to-transparent p-10 text-center">
      <div className="size-14 mx-auto mb-4 rounded-2xl bg-gold/10 grid place-items-center text-gold-bright">
        <Wrench className="size-6" />
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
