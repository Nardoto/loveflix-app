import { PageHead } from '@/components/admin/AdminUI';
import { UnderConstruction } from '@/components/admin/UnderConstruction';

export default function AdminUsersPage() {
  return (
    <>
      <PageHead title="Usuários" subtitle="Lista de quem se cadastrou + plano + última atividade" />
      <UnderConstruction
        title="Painel de usuários"
        hint="Vai listar email + plano + último acesso, com ações de banir/promover."
      />
    </>
  );
}
