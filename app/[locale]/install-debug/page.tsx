import { setRequestLocale } from 'next-intl/server';
import { InstallDebugPanel } from '@/components/layout/InstallDebugPanel';

// Página pública de debug do PWA install. Não precisa de auth — qualquer
// um pode abrir no celular dele e mandar print pro suporte.
//
// URL: alluretv.net/install-debug (ou /en/install-debug, /de/install-debug
// dependendo da locale).
//
// Usado pra diagnosticar:
//   • por que o banner de install não aparece num iPhone específico
//   • se o `beforeinstallprompt` foi capturado num Android
//   • se o user já tá em standalone (PWA instalado)
//   • se o user agent indica Chrome iOS (que não pode instalar PWA)

export default async function InstallDebugPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <InstallDebugPanel />;
}

export const dynamic = 'force-dynamic';
