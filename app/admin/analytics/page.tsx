import { PageHead } from '@/components/admin/AdminUI';
import { UnderConstruction } from '@/components/admin/UnderConstruction';

export default function AdminAnalyticsPage() {
  return (
    <>
      <PageHead title="Analytics" subtitle="Gráficos de retenção, churn e MRR ao longo do tempo" />
      <UnderConstruction
        title="Painel de analytics"
        hint="Vai trazer line charts de MRR/novos assinantes/churn e top stories por play count."
      />
    </>
  );
}
