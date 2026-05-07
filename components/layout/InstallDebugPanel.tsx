'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  Info,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { useInstall } from './InstallProvider';

// Painel de debug do PWA install. Mostra TUDO que a gente consegue saber
// sobre o ambiente do usuário pra diagnosticar por que o install não tá
// funcionando. Pensado pra ser printado e mandado pro suporte.

export function InstallDebugPanel() {
  const install = useInstall();
  const [manifestStatus, setManifestStatus] = useState<string>('checking…');
  const [swStatus, setSwStatus] = useState<string>('checking…');
  const [iconStatus, setIconStatus] = useState<string>('checking…');

  useEffect(() => {
    // Bate no manifest pra confirmar que tá acessível
    fetch('/manifest.webmanifest')
      .then((r) => {
        if (r.ok && r.headers.get('content-type')?.includes('manifest')) {
          setManifestStatus(`✓ ${r.status} ${r.headers.get('content-type')}`);
        } else {
          setManifestStatus(`✗ ${r.status} ${r.headers.get('content-type')}`);
        }
      })
      .catch((e) => setManifestStatus(`✗ erro: ${e.message}`));

    // SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg) {
            setSwStatus(`✓ registrado (scope ${reg.scope})`);
          } else {
            setSwStatus('✗ não registrado');
          }
        })
        .catch((e) => setSwStatus(`✗ erro: ${e.message}`));
    } else {
      setSwStatus('✗ navegador não suporta');
    }

    // Icon
    fetch('/icons/icon-192.png')
      .then((r) => {
        if (r.ok) setIconStatus(`✓ ${r.status}`);
        else setIconStatus(`✗ ${r.status}`);
      })
      .catch((e) => setIconStatus(`✗ erro: ${e.message}`));
  }, []);

  const verdict = (() => {
    if (install.isStandalone) {
      return {
        ok: true,
        title: 'Já instalado',
        msg: 'Você está rodando o AllureTV como app instalado (display-mode: standalone). Tudo certo.',
      };
    }
    if (install.canPromptNative) {
      return {
        ok: true,
        title: 'Pronto pra instalar',
        msg: 'Browser disparou beforeinstallprompt. Toca no botão "Instalar" abaixo.',
      };
    }
    if (install.canShowIOSGuide) {
      return {
        ok: true,
        title: 'iOS Safari — instalável manualmente',
        msg: 'Toca o botão "Instalar" abaixo pra ver os 3 passos (Share → Add to Home Screen → Add).',
      };
    }
    if (install.needsSafariSwitch) {
      return {
        ok: false,
        title: 'iOS — precisa abrir no Safari',
        msg: 'Você está no Chrome/Firefox/Edge no iPhone. Apple só deixa o Safari instalar PWA. Copia o link e abre no Safari.',
      };
    }
    return {
      ok: false,
      title: 'Browser não suporta install',
      msg: 'Talvez seja Firefox desktop, navegador antigo, ou contexto inseguro (HTTP). Tenta no Chrome/Edge/Safari.',
    };
  })();

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 md:py-16">
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold-bright mb-2">
          Debug
        </p>
        <h1 className="font-serif italic font-black text-3xl md:text-4xl text-white mb-2">
          Diagnóstico de instalação
        </h1>
        <p className="text-[14px] text-text-dim">
          Esta página mostra tudo que conseguimos detectar do seu navegador.
          Se o botão de instalar não aparece, manda print desta página.
        </p>
      </header>

      {/* Veredito grande */}
      <div
        className={[
          'rounded-2xl border p-5 mb-6',
          verdict.ok
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-amber-500/10 border-amber-500/30',
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          {verdict.ok ? (
            <CheckCircle2 className="size-6 text-emerald-300 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="size-6 text-amber-300 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white text-[16px] mb-1">{verdict.title}</h2>
            <p className="text-[13px] text-text-soft leading-relaxed">{verdict.msg}</p>
          </div>
        </div>

        {(install.canPromptNative || install.canShowIOSGuide) && (
          <button
            type="button"
            onClick={() => install.triggerInstall()}
            className="mt-4 inline-flex items-center gap-2 px-4 h-11 rounded-full bg-gradient-to-r from-rose to-rose-deep text-white font-bold text-sm shadow shadow-rose/30 active:scale-95 transition-transform"
          >
            <Download className="size-4" /> Instalar AllureTV
          </button>
        )}
      </div>

      {/* Tabela de detecção */}
      <Section title="Detecção">
        <Row label="Plataforma" value={install.debug.detectedAs} ok={install.debug.detectedAs !== 'server'} />
        <Row label="Standalone (já instalado)" value={String(install.isStandalone)} ok={install.isStandalone} neutral={!install.isStandalone} />
        <Row label="iOS detectado" value={String(install.isIOS)} neutral />
        <Row label="iOS Safari (instalável)" value={String(install.isIOSSafari)} ok={install.isIOSSafari} neutral={!install.isIOS} />
        <Row label="Precisa trocar pro Safari" value={String(install.needsSafariSwitch)} fail={install.needsSafariSwitch} neutral={!install.needsSafariSwitch} />
        <Row label="beforeinstallprompt capturado (Android)" value={String(install.debug.capturedBIP)} ok={install.debug.capturedBIP} neutral={!install.canPromptNative && !install.isIOS} />
      </Section>

      <Section title="Recursos do navegador">
        <Row label="Service Worker suportado" value={String(install.debug.serviceWorkerSupported)} ok={install.debug.serviceWorkerSupported} />
        <Row label="Service Worker registrado" value={swStatus} ok={swStatus.startsWith('✓')} />
        <Row label="Manifest acessível" value={manifestStatus} ok={manifestStatus.startsWith('✓')} />
        <Row label="Ícone 192px acessível" value={iconStatus} ok={iconStatus.startsWith('✓')} />
        <Row label="Contexto seguro (HTTPS)" value={String(install.debug.secureContext)} ok={install.debug.secureContext} />
        <Row label="display-mode atual" value={install.debug.displayMode} neutral />
      </Section>

      <Section title="Identidade técnica">
        <Row label="Platform" value={install.debug.platform || '(vazio)'} neutral />
        <Row label="MaxTouchPoints" value={String(install.debug.maxTouchPoints)} neutral />
        <Row label="Dismissed antes" value={String(install.dismissed)} neutral />
      </Section>

      {/* User Agent (text wrap) */}
      <details className="mb-6 rounded-xl border border-white/[0.08] bg-bg-card/60 overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer text-[13px] font-bold text-white">
          User Agent (clique pra expandir)
        </summary>
        <pre className="px-4 pb-4 text-[11px] text-text-dim font-mono break-all whitespace-pre-wrap">
          {install.debug.userAgent}
        </pre>
      </details>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          type="button"
          onClick={() => {
            const blob = new Blob(
              [
                JSON.stringify(
                  {
                    isStandalone: install.isStandalone,
                    isIOS: install.isIOS,
                    isIOSSafari: install.isIOSSafari,
                    canPromptNative: install.canPromptNative,
                    canShowIOSGuide: install.canShowIOSGuide,
                    needsSafariSwitch: install.needsSafariSwitch,
                    dismissed: install.dismissed,
                    debug: install.debug,
                    manifestStatus,
                    swStatus,
                    iconStatus,
                    timestamp: new Date().toISOString(),
                  },
                  null,
                  2,
                ),
              ],
              { type: 'application/json' },
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `alluretv-install-debug-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-4 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-text-soft text-sm font-semibold inline-flex items-center gap-2"
        >
          <Info className="size-4" /> Baixar JSON
        </button>

        {install.dismissed && (
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('alluretv-install-dismissed');
              window.location.reload();
            }}
            className="px-4 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-rose-bright text-sm font-semibold inline-flex items-center gap-2"
          >
            <XCircle className="size-4" /> Resetar "dismissed"
          </button>
        )}

        {install.needsSafariSwitch && (
          <a
            href={typeof window !== 'undefined' ? window.location.href : '/'}
            className="px-4 h-10 rounded-full bg-rose/20 text-rose-bright text-sm font-semibold inline-flex items-center gap-2"
          >
            <ExternalLink className="size-4" /> Copiar URL e abrir no Safari
          </a>
        )}
      </div>

      <p className="text-[12px] text-text-mute leading-relaxed">
        <Smartphone className="inline size-3.5 mr-1" />
        Se algo aqui está vermelho/âmbar e você espera que esteja verde,
        manda print pro suporte (ou clica em "Baixar JSON" e anexa).
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-xl border border-white/[0.06] bg-bg-card/60 overflow-hidden">
      <h3 className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-mute border-b border-white/[0.05]">
        {title}
      </h3>
      <ul>{children}</ul>
    </section>
  );
}

function Row({
  label,
  value,
  ok,
  fail,
  neutral,
}: {
  label: string;
  value: string;
  ok?: boolean;
  fail?: boolean;
  neutral?: boolean;
}) {
  const tone =
    fail || (!ok && !neutral && value === 'false')
      ? 'text-amber-300'
      : ok
        ? 'text-emerald-300'
        : 'text-text-soft';
  return (
    <li className="flex items-baseline gap-3 px-4 py-2 border-b border-white/[0.04] last:border-b-0">
      <span className="text-[12px] text-text-dim flex-1 min-w-0">{label}</span>
      <span className={`text-[12px] font-mono break-all text-right max-w-[60%] ${tone}`}>
        {value}
      </span>
    </li>
  );
}
