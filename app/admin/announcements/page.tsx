import { createServiceClient } from '@/lib/supabase/server';
import { PageHead } from '@/components/admin/AdminUI';
import { AnnouncementComposer } from '@/components/admin/AnnouncementComposer';
import { AnnouncementsList } from '@/components/admin/AnnouncementsList';

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  link_path: string | null;
  created_by: string | null;
  created_at: string;
  reads_count: number;
};

async function loadAnnouncements(): Promise<AnnouncementRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  try {
    const sb = createServiceClient();
    const { data: anns, error } = await sb
      .from('announcements')
      .select('id, title, body, link_path, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Failed to load announcements:', error);
      return [];
    }
    if (!anns || anns.length === 0) return [];

    // Aggregate reads per announcement in one query.
    const ids = anns.map((a) => a.id);
    const { data: reads } = await sb
      .from('announcement_reads')
      .select('announcement_id')
      .in('announcement_id', ids);

    const readCounts = new Map<string, number>();
    for (const r of reads ?? []) {
      readCounts.set(r.announcement_id, (readCounts.get(r.announcement_id) ?? 0) + 1);
    }

    return anns.map((a) => ({
      ...a,
      reads_count: readCounts.get(a.id) ?? 0,
    }));
  } catch (e) {
    console.error('Admin announcements query crashed:', e);
    return [];
  }
}

export default async function AdminAnnouncementsPage() {
  const announcements = await loadAnnouncements();

  return (
    <>
      <PageHead
        title="Anúncios"
        subtitle="Publique uma notificação broadcast pros usuários — aparece no sininho do app em tempo real."
      />
      <AnnouncementComposer />
      <div className="mt-8">
        <AnnouncementsList items={announcements} />
      </div>
    </>
  );
}
