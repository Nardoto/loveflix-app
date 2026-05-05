import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Film, Image as ImageIcon, BookOpen, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { allStories } from '@/lib/data/stories';
import { requireAdmin } from '@/lib/auth-helpers';
import { UploadStoryDialog } from '@/components/studio/UploadStoryDialog';

export default async function StudioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Studio is admin-only. Block both anonymous and non-admin users.
  // Auth UI lives at /account; supabase login flow is configured there.
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect(`/${locale}`);
  }

  return (
    <div className="pt-24 md:pt-28 px-5 md:px-10 lg:px-14 max-w-6xl mx-auto pb-20">
      <header className="flex items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gold-bright mb-2">
            Studio · Creator dashboard
          </p>
          <h1 className="font-serif italic text-3xl md:text-5xl font-black text-white">
            Your Stories
          </h1>
        </div>
        <UploadStoryDialog />
      </header>

      <div className="grid md:grid-cols-4 gap-4 mb-10">
        <Stat label="Stories" value={String(allStories.length)} />
        <Stat label="Published" value="1" />
        <Stat label="Coming Soon" value={String(allStories.length - 1)} />
        <Stat label="Languages" value="4" />
      </div>

      <section className="mb-10">
        <h2 className="font-serif italic text-2xl font-bold text-white mb-4">
          Upload pipeline
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <PipelineCard icon={<ImageIcon />} title="Cover & Hero" desc="16:9 image · 1920×1080+" />
          <PipelineCard icon={<Film />} title="Video" desc="MP4 → Cloudflare R2" />
          <PipelineCard icon={<Languages />} title="4 Audio Tracks" desc="EN · DE · FR · ES" />
          <PipelineCard icon={<BookOpen />} title="E-book Pages" desc="Text + image per page" />
        </div>
      </section>

      <section>
        <h2 className="font-serif italic text-2xl font-bold text-white mb-4">
          Recent stories
        </h2>
        <div className="bg-bg-elevated rounded-2xl overflow-hidden shadow-lg shadow-black/30">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left">
              <tr className="text-[10px] font-bold uppercase tracking-widest text-text-mute">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 hidden md:table-cell">Genre</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden lg:table-cell">Audio</th>
                <th className="px-4 py-3 hidden lg:table-cell">E-book</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allStories.slice(0, 8).map((s) => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-serif italic text-text-soft truncate max-w-[200px]">
                    {s.title}
                  </td>
                  <td className="px-4 py-3 text-text-dim capitalize hidden md:table-cell">
                    {s.genre.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3">
                    {s.isFree || s.videoSrc ? (
                      <Badge variant="free">Published</Badge>
                    ) : (
                      <Badge variant="comingSoon">Draft</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-dim hidden lg:table-cell">
                    {s.audioByLocale ? '4/4' : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-dim hidden lg:table-cell">
                    {s.hasEbook ? '53 pages' : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" disabled>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-mute mt-4">
          Files land in R2 under <code className="font-mono">stories/{'{slug}'}/book{'{N}'}/</code>.
          Catalog rows are still mocked — Sprint 1 wires them to Supabase.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-elevated rounded-2xl p-5 shadow-md shadow-black/20">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-mute mb-1">
        {label}
      </p>
      <p className="font-serif italic text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function PipelineCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-bg-elevated rounded-2xl p-5 shadow-md shadow-black/20 hover:shadow-rose/20 transition-shadow">
      <div className="size-10 rounded-xl bg-rose/10 text-rose-bright grid place-items-center mb-3 [&_svg]:size-5">
        {icon}
      </div>
      <h3 className="font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-text-dim">{desc}</p>
    </div>
  );
}
