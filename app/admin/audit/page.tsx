import { PageHead } from '@/components/admin/AdminUI';
import { UnderConstruction } from '@/components/admin/UnderConstruction';

export default function AdminAuditPage() {
  return (
    <>
      <PageHead title="Auditoria" subtitle="Log das ações administrativas — quem editou o quê e quando" />
      <UnderConstruction
        title="Log de auditoria"
        hint="Cada createStory/updateStory/deleteStory passa a gravar uma linha aqui."
      />
    </>
  );
}
