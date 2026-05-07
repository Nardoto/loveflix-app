import { PageHead } from '@/components/admin/AdminUI';
import { UnderConstruction } from '@/components/admin/UnderConstruction';

export default function AdminSettingsPage() {
  return (
    <>
      <PageHead title="Configurações" subtitle="Feature flags e ajustes do site" />
      <UnderConstruction
        title="Configurações do sistema"
        hint="Toggles globais (ex: pausar checkouts, abrir / fechar PWA install banner)."
      />
    </>
  );
}
