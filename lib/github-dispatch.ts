// Dispara o workflow `.github/workflows/faststart-optimize.yml` via
// `repository_dispatch`. Fire-and-forget — usado depois que o upload de
// vídeo termina pra rodar ffmpeg -movflags +faststart sem o uploader
// precisar fazer nada.
//
// Sem GITHUB_DISPATCH_TOKEN ou GITHUB_REPO no env, o helper só loga e
// retorna — o cron horário da action pega na próxima passada.

type DispatchOpts = {
  /** Event type que o workflow escuta. Match com `on.repository_dispatch.types`. */
  eventType: string;
  /** Payload passado pro workflow via `github.event.client_payload`. */
  payload?: Record<string, unknown>;
};

export async function dispatchWorkflow({ eventType, payload }: DispatchOpts): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO; // formato "owner/repo"

  if (!token || !repo) {
    // Sem credencial: cai pro fluxo de cron. Log discreto pra debug.
    console.warn('[github-dispatch] GITHUB_DISPATCH_TOKEN/GITHUB_REPO ausentes — pulando dispatch');
    return;
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: eventType,
      client_payload: payload ?? {},
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub dispatch falhou: ${res.status} ${text}`);
  }
}

/** Atalho específico pra otimização de vídeo (faststart). */
export function dispatchOptimizeVideo(key: string): Promise<void> {
  return dispatchWorkflow({ eventType: 'optimize-video', payload: { key } });
}
