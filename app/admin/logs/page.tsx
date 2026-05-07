import { PageHead } from '@/components/admin/AdminUI';
import { UnderConstruction } from '@/components/admin/UnderConstruction';

export default function AdminLogsPage() {
  return (
    <>
      <PageHead title="Logs" subtitle="Logs do servidor — Vercel + Worker R2 + Supabase" />
      <UnderConstruction
        title="Logs do sistema"
        hint="Pull dos últimos eventos do Vercel Functions + tail do Worker via API."
      />
    </>
  );
}
