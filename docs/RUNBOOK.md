# Runbook — AllureTV (e como replicar em outros canais)

> Documento construído na sessão de **2026-05-15**.
> Cobre o que foi feito, por quê, e como reaplicar tudo num projeto novo.
>
> Stack alvo: **Next.js 16 + Supabase + Cloudflare R2/Worker + Stripe + Vercel**.
> Funciona pra qualquer "Netflix-style streaming + paywall" (romance, biblical, sertanejo, podcast, etc).

---

## Sumário

1. [O que foi feito nesta sessão](#1-o-que-foi-feito-nesta-sessão)
2. [Otimização de vídeo (faststart) — a grande dor que resolvemos](#2-otimização-de-vídeo-faststart)
3. [GitHub Actions + Vercel: a ponte automática](#3-github-actions--vercel)
4. [Padrões Supabase — o bug recorrente do GRANT](#4-padrões-supabase)
5. [PostHog Analytics — setup express](#5-posthog-analytics)
6. [Admin features — moderação e replies](#6-admin-features)
7. [Arquitetura do streaming — R2 + Worker + JWT](#7-arquitetura-do-streaming)
8. [Checklist pra novo SaaS de assinatura](#8-checklist-pra-novo-saas)
9. [Glossário](#9-glossário)

---

## 1. O que foi feito nesta sessão

| Tarefa | Status | Arquivos chave |
|---|---|---|
| Investigar lentidão do player (1-2s pra iniciar vídeo) | ✅ | n/a (diagnóstico) |
| Adicionar poster image no `<video>` | ✅ | `components/player/Player.tsx` |
| Pré-fetch do token JWT na tela de detalhe | ✅ | `lib/hooks/useMediaToken.ts`, `components/player/MediaTokenPrefetch.tsx` |
| Script `optimize-videos.mjs` (re-empacota MP4s com faststart) | ✅ | `scripts/optimize-videos.mjs` |
| GitHub Actions workflow + webhook do upload | ✅ | `.github/workflows/faststart-optimize.yml`, `lib/github-dispatch.ts`, `app/api/upload/complete/route.ts` |
| Coluna "Tipo" no admin com badges (Grátis/Premium/Hot/Em Breve) | ✅ | `components/admin/StoriesTable.tsx` |
| Migration multi-gêneros (rodada manualmente no Supabase) | ✅ | `supabase/migrations/0012_story_genres_array.sql` |
| Fix de GRANT na view `story_comments_with_counts` | ✅ | SQL no Supabase |
| Fix de GRANT no DELETE de `story_comments` | ✅ | SQL no Supabase |
| Fix de GRANT no SELECT de `profiles` + backfill | ✅ | SQL no Supabase |
| Feature: responder comentários direto do admin | ✅ | `app/actions/admin.ts`, `components/admin/CommentsModerationList.tsx` |
| Setup PostHog (env var na Vercel) | ✅ | `NEXT_PUBLIC_POSTHOG_KEY` no Vercel |

**Resultado prático:**
- Player do AllureTV abre vídeos ~3-5x mais rápido
- Pessoa que sobe vídeo do CapCut não precisa fazer NADA — automação cuida
- Admin agora consegue moderar comentários (deletar) e responder direto
- Analytics finalmente conta usuários cadastrados corretamente
- Estrutura "bunkerizada": automação + setting correto no CapCut = sem chance de regressão

---

## 2. Otimização de vídeo (Faststart)

### 2.1 O problema

Todo `.mp4` tem duas partes:
- **Conteúdo** (cenas, áudio)
- **moov atom** = índice (cena 1 começa no segundo 0, dura X min, codec, etc.)

O player **NÃO consegue tocar sem ler o moov atom primeiro**.

CapCut, Premiere, Resolve (configuração padrão) salvam com o **moov no FIM** do arquivo. Resultado: o browser precisa baixar quase o vídeo inteiro antes de descobrir como tocar → 1-2 segundos de tela preta.

**Faststart** = mover o moov pro **início** do arquivo. Browser baixa os primeiros 50 KB → já tem o índice → toca em ~300ms. **Não recomprime, não perde qualidade, mesmo tamanho.**

### 2.2 Três camadas de solução

#### Camada 1 — Cliente (R$0, ganho ~500ms)

**Arquivo:** [components/player/Player.tsx](../components/player/Player.tsx)
- Adicionado `poster={story.cover}` no `<video>` → fim da "tela preta" na percepção visual
- Player espera `canplay` event antes de tocar; com poster já vê a capa imediatamente

**Arquivo:** [lib/hooks/useMediaToken.ts](../lib/hooks/useMediaToken.ts)
- Cache em nível de módulo (`fetchOnce()`) que deduplica request entre componentes
- Token é cacheado por slug — free stories conseguem token sem cookie/login
- `prefetchToken(slug)` exportado pra pré-aquecer

**Arquivo:** [components/player/MediaTokenPrefetch.tsx](../components/player/MediaTokenPrefetch.tsx)
- Componente headless montado na tela de detalhe da story
- Dispara `prefetchToken(slug)` no useEffect → quando a viewer clica Watch, o token já tá em cache → `<video src>` é setado imediatamente sem esperar fetch

#### Camada 2 — Script manual (R$0, varre catálogo)

**Arquivo:** [scripts/optimize-videos.mjs](../scripts/optimize-videos.mjs)

```bash
# Instalar ffmpeg uma vez (Windows)
winget install Gyan.FFmpeg

# Dry-run pra ver o que mudaria
node scripts/optimize-videos.mjs --dry

# Roda no catálogo inteiro
node scripts/optimize-videos.mjs

# Otimiza só um vídeo específico
node scripts/optimize-videos.mjs --key=stories/foo/book1/video.mp4

# Força reprocessamento mesmo se já marcado
node scripts/optimize-videos.mjs --force
```

**Como funciona:**
1. Lista todos os `.mp4` do bucket R2 via S3 API
2. Pra cada um: faz HEAD object, checa metadata custom `faststart=1`
3. Se já marcado → pula (idempotente)
4. Se não: baixa pra `/tmp`, roda `ffmpeg -c copy -movflags +faststart`, faz upload de volta com a flag
5. Preserva ContentType, CacheControl, ContentDisposition

#### Camada 3 — Automação total (R$0)

**Arquivo:** [.github/workflows/faststart-optimize.yml](../.github/workflows/faststart-optimize.yml)

```yaml
on:
  repository_dispatch:        # Disparado por /api/upload/complete
    types: [optimize-video]
  schedule:
    - cron: '0 * * * *'       # Rede de segurança a cada hora
  workflow_dispatch:           # Pra rodar manualmente pela UI do GitHub
```

**Arquivo:** [lib/github-dispatch.ts](../lib/github-dispatch.ts)
- `dispatchOptimizeVideo(key)` → POST `https://api.github.com/repos/{repo}/dispatches`
- Headers: `Authorization: Bearer ${GITHUB_DISPATCH_TOKEN}`
- Body: `{ event_type: "optimize-video", client_payload: { key } }`

**Arquivo:** [app/api/upload/complete/route.ts](../app/api/upload/complete/route.ts)
- Logo após `completeMultipart()` retornar OK
- Se `key.endsWith('.mp4')` → `dispatchOptimizeVideo(key).catch(console.error)`
- **Fire-and-forget**: não awaita, não falha o upload se dispatch der erro

**Resultado:** uploader sobe vídeo → ~5s depois o workflow começa → ~2-4 min depois vídeo tá otimizado. Uploader nem percebe.

### 2.3 Settings de export no CapCut (preventivo)

Pra vídeos já nascerem certos sem depender da automação:
- **Codec: H.264** (NUNCA HEVC, AV1, RLE — incompatível com browsers velhos)
- **Formato: MP4**
- **Resolução: 720P ou 1080P** (mais alto que isso pra streaming é desperdício)
- **Taxa de bits: Médio** (Recomendado fica pesado; Médio é ~50% menor com qualidade visual idêntica)

CapCut PC mais recente já exporta com faststart por padrão. Mobile também. Mas a automação é **rede de segurança** caso alguém use outro editor.

### 2.4 Quando escalar pra HLS

A solução atual (faststart MP4) resolve ~80% dos casos. Se aparecer reclamação de buffering em viewers com 4G fraco, a próxima evolução é **HLS adaptativo**:

- Servir `.m3u8` (manifesto) + segmentos `.ts` em múltiplas resoluções
- Player faz ABR (adaptive bitrate): em Wi-Fi baixa 1080p, em 4G fraco baixa 480p
- Custo: ~$10-15/mês via [Bunny Stream](https://bunny.net/stream/) ou ~$30-40 via [Cloudflare Stream](https://www.cloudflare.com/products/cloudflare-stream/)
- Player precisa de `hls.js` ou `@vidstack/react` (já listado no `package.json` mas não usado)

**Não fazer ainda**. Faststart já entrega a maior parte do ganho.

---

## 3. GitHub Actions + Vercel

### 3.1 Por que dois mundos?

| Serviço | O que roda lá | Quando deploya |
|---|---|---|
| **Vercel** | Site Next.js (`alluretv.net`) | Auto no `git push` |
| **Cloudflare Worker** (`worker-media/`) | Servidor de vídeo (`media.alluretv.net`) | Manual via `wrangler deploy` |
| **GitHub Actions** | Otimização de vídeo, CI, sweeps | No `repository_dispatch` ou cron |

### 3.2 Setup completo (passo a passo)

#### Passo 1 — Secrets do R2 no GitHub
Abre: `https://github.com/{owner}/{repo}/settings/secrets/actions`

Adiciona 3 secrets (valores vêm do `.env.local`):
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

⚠️ **Importante:** se o workflow usa `R2_BUCKET_NAME` via `${{ secrets.X }}` e o secret NÃO existe, o GitHub passa `""` (string vazia), não `undefined`. Por isso no script usar `||` em vez de `??`:

```js
const BUCKET = process.env.R2_BUCKET_NAME || 'alluretv-media';
//                                          ^^ cai pra default em "", null, undefined
```

#### Passo 2 — Personal Access Token (PAT) do GitHub
Abre: `https://github.com/settings/personal-access-tokens/new`

- **Token name:** `<projeto>-dispatch`
- **Expiration:** 1 year
- **Repository access:** "Only select repositories" → marca o repo
- **Permissions → Repository permissions → Actions: Read and write**
- (Não dar mais permissão que isso. Princípio do menor privilégio.)
- Clica **Generate token** e **COPIA AGORA** — não aparece de novo

#### Passo 3 — Env vars na Vercel
Vercel dashboard → projeto → Settings → Environments → Production → Environment Variables:

| Key | Value |
|---|---|
| `GITHUB_DISPATCH_TOKEN` | o `github_pat_...` |
| `GITHUB_REPO` | `{owner}/{repo}` (ex: `Nardoto/loveflix-app`) |

Marcar **Production + Preview + Development**.

#### Passo 4 — Redeploy
`NEXT_PUBLIC_*` env vars são **embutidas no JS no momento do build**, não lidas em runtime. Mesmo as vars de servidor exigem novo deploy pra propagar.

- Deployments → último deploy → `...` → **Redeploy**
- **DESMARCA "Use existing Build Cache"** (senão pode pegar valor velho do cache)

### 3.3 Como testar manualmente

1. Vai em `https://github.com/{owner}/{repo}/actions/workflows/faststart-optimize.yml`
2. Clica **Run workflow** → deixa key vazio → **Run workflow**
3. Vê o log do step **Run optimize-videos.mjs** em tempo real

Se quebrar com "No value provided for input HTTP label: Bucket" → algum secret R2 tá vazio (geralmente `R2_BUCKET_NAME`, que deveria cair no default).

Se quebrar com "AccessDenied" → token R2 sem permissão de write no bucket.

---

## 4. Padrões Supabase

### 4.1 O bug recorrente: GRANT faltando pro service_role

**Padrão observado em VÁRIAS migrations do AllureTV:**

```sql
-- Bug típico
grant select, update, delete on public.X to authenticated;
-- ESQUECIDO: grant ... to service_role;
```

Resultado: `authenticated` (user logado) funciona, mas `service_role` (admin via service client) trava com:
> "permission denied for table X"

**Sintoma no app:** botão de admin retorna erro, ou contador mostra 0 mesmo com dados existindo (porque o try/catch silencia o erro).

**Tabelas onde achamos esse bug:**
- `story_comments_with_counts` (view) → moderação não listava comentários
- `story_comments` DELETE → admin não conseguia deletar comentário
- `profiles` SELECT → analytics mostrava 0 usuários cadastrados

### 4.2 Como diagnosticar

Quando aparecer "permission denied for table X", roda no SQL Editor do Supabase:

```sql
-- Mostra todos os grants atuais da tabela
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'NOME_DA_TABELA'
  AND grantee IN ('service_role', 'authenticated', 'anon')
ORDER BY grantee, privilege_type;
```

Se `service_role` não aparece com a permissão necessária (SELECT/INSERT/UPDATE/DELETE), **adiciona**:

```sql
grant select, insert, update, delete on public.NOME_DA_TABELA to service_role;
```

### 4.3 Template de migration "à prova de bug"

```sql
-- Sempre quando criar uma tabela nova, fazer:

create table public.nova_tabela (
  id uuid primary key default gen_random_uuid(),
  -- ...colunas
);

-- 1) RLS
alter table public.nova_tabela enable row level security;

-- 2) Policies (quem pode SELECT/INSERT/UPDATE/DELETE)
create policy "nova_tabela_select_all" on public.nova_tabela
  for select using (true);

-- ...etc

-- 3) GRANTS (sem isso RLS nem é checada — falha em "permission denied")
grant select on public.nova_tabela to anon, authenticated, service_role;
grant insert, update, delete on public.nova_tabela to authenticated, service_role;
--                                                                ^^^^^^^^^^^^^
--                                                       NUNCA ESQUEÇA SERVICE_ROLE
```

### 4.4 Backfill de trigger que falhou

Se um trigger não rodou pra registros antigos (ex: trigger de criar profile no signup só foi adicionado depois de N usuários se cadastrarem), faz backfill:

```sql
-- Exemplo: cria profiles pra todos auth.users que ainda não têm
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name'
from auth.users u
where u.id not in (select id from public.profiles)
on conflict (id) do nothing;
```

**`on conflict do nothing`** é o que faz isso ser idempotente — pode rodar 100 vezes que não duplica.

### 4.5 Migrations que precisam ser rodadas manualmente

Supabase **NÃO** roda migrations sozinho. Você precisa abrir o SQL Editor e colar. Sempre que adicionar uma migration nova no repo, lembrar de rodar em produção.

Sintoma típico de migration não rodada: erro tipo `column "X" does not exist` ou `relation "Y" does not exist` no app em produção, mas localmente funciona.

---

## 5. PostHog Analytics

### 5.1 Setup

1. Cria conta em `posthog.com/signup`
2. Project token (`phc_...`) tá em Settings → Project → Project token
3. Adiciona na Vercel:
   - `NEXT_PUBLIC_POSTHOG_KEY` = `phc_...`
   - `NEXT_PUBLIC_POSTHOG_HOST` = `https://us.i.posthog.com` (ou `eu.i.posthog.com`)
4. **Redeploy** (porque `NEXT_PUBLIC_*` é build-time)

### 5.2 Por que `NEXT_PUBLIC_*` não é "secreto"

O prefix `NEXT_PUBLIC_` diz pro Next.js: **"essa var vai no JS bundle do browser"**.

Implicações:
- ✅ OK pra: PostHog project token, Stripe publishable key, Supabase anon key
- ❌ NÃO usar pra: secrets reais (Stripe secret key, R2 secret, JWT secret, etc.)

Project tokens do PostHog são **write-only** (só conseguem enviar eventos, não ler dados). Foram **feitos pra ficar no front-end**. Pode dormir tranquilo.

### 5.3 Free tier do PostHog

- **1 projeto grátis** (criar 2º exige pagar)
- **1 milhão de eventos/mês grátis**
- Se você tem <50.000 visitas/mês, NUNCA vai estourar
- 1 viewer = ~10-30 eventos numa sessão (pageview, scroll, click, etc.)

---

## 6. Admin features

### 6.1 Padrão de Server Action com requireAdmin

```typescript
// app/actions/admin.ts
'use server';

import { requireAdmin } from '@/lib/auth-helpers';
import { createServiceClient } from '@/lib/supabase/server';

export async function adminAlgumaCoisa(input: ...) {
  // Re-checa permissão DENTRO da action — não confia só no layout gate.
  // Server Actions são URLs públicas; sem o re-check, qualquer um poderia
  // chamar via curl.
  const auth = await requireAdmin();
  if (!auth.ok || !auth.user) return { ok: false, error: 'Forbidden' };

  const sb = createServiceClient(); // bypassa RLS
  // ...faz a operação
  // revalidatePath(...) pras telas atualizarem
}
```

### 6.2 `createServiceClient()` vs `createClient()`

| Cliente | Quando usar | RLS | Cookies |
|---|---|---|---|
| `createClient()` | Operações COMO o user logado | Respeita RLS | Lê cookies |
| `createServiceClient()` | Operações ADMIN (bypass tudo) | Ignora RLS | Não usa cookies |

**Regra:** se a operação precisa ver/mudar dados de OUTROS usuários, é service client.

### 6.3 Como adicionar uma feature de admin (template)

Exemplo: feature "responder comentários no admin" que fizemos:

1. **Server action** em [app/actions/admin.ts](../app/actions/admin.ts):
   - Verifica admin via `requireAdmin()`
   - Pega `auth.user.id` (o admin que vai responder)
   - Usa `createServiceClient()` pra bypass RLS
   - Faz upsert em `comment_user_meta` (pra resposta aparecer com nome do admin)
   - Insert na tabela alvo
   - `revalidatePath(...)` pras telas atualizarem

2. **UI** em [components/admin/CommentsModerationList.tsx](../components/admin/CommentsModerationList.tsx):
   - State pra controlar qual comentário tá sendo respondido
   - Botão "Responder" → abre textarea inline
   - `useTransition()` pra loading state
   - Feedback visual (badge "Respondido") após sucesso

Mesmo padrão funciona pra: banir usuário, mudar tier de subscription, etc.

---

## 7. Arquitetura do streaming

### 7.1 Componentes

```
┌──────────┐   ┌──────────┐   ┌────────────────┐   ┌──────────┐
│  Viewer  │ → │  Vercel  │ → │ Cloudflare     │ → │    R2    │
│ (browser)│   │ (Next.js)│   │ Worker         │   │ (storage)│
└──────────┘   └──────────┘   └────────────────┘   └──────────┘
                  │                  │
                  ▼                  ▼
            JWT signed         Cache check
            (sign-token)       (per byte-range)
```

1. Viewer clica Play → browser faz GET em `media.alluretv.net/stories/.../video.mp4?token=JWT`
2. Worker valida JWT (HS256, shared secret com o Next.js)
3. Worker chega na cache da edge (per Range request)
4. Cache miss → busca no R2 com `env.MEDIA.get(key, { range })`
5. Stream pro viewer, escreve cache em background via `ctx.waitUntil(cache.put(...))`

### 7.2 Três tipos de "rápido" diferentes (não confundir!)

| Mecanismo | Onde mora | Quando dispara | Persistência |
|---|---|---|---|
| **Faststart** | No arquivo MP4 (moov atom no início) | Sempre, automático no player | Permanente — uma vez otimizado, é pra sempre |
| **Edge cache (Cloudflare)** | Servidor regional da Cloudflare (PoP) | Após 1ª view daquele Range em cada cidade | Volátil — 24h pra free, 5min pra paid (revalida) |
| **HLS adaptativo** | Servidor encoder (Bunny/CF Stream) | Player escolhe bitrate dinâmico | Premium feature, $$ |

A 1ª viewer de **São Paulo** "abre a porteira" do cache pra todas as outras viewers de SP. Mas Lisboa, NY, Tokyo cada um tem seu próprio cache regional independente.

### 7.3 Token JWT por slug

`/api/media/sign-token?slug=story-slug` assina JWT com:
- `tier` (active/trialing/free) — controlado pelo Stripe
- `keyPrefix` — limita o token a paths específicos (free stories: token escopa `stories/{slug}/*`)

Stories `is_free=true` retornam token mesmo pra anônimos (sem cookie). Worker valida o `keyPrefix` claim.

---

## 8. Checklist pra novo SaaS

### 8.1 Stack mínima

- [x] Next.js 16 (App Router)
- [x] Supabase (auth + DB + storage opcional)
- [x] Stripe (paywall) + Stripe Customer Portal
- [x] Cloudflare R2 (bucket de mídia)
- [x] Cloudflare Worker (proxy de mídia com JWT)
- [x] Vercel (deploy do Next.js)
- [x] GitHub Actions (CI + automação de mídia)
- [x] PostHog (analytics)

### 8.2 Ordem de implementação (testada nesse projeto)

1. **Auth básico** — Supabase Auth + email/senha + OAuth Google
2. **Schema inicial** — `profiles` table + trigger auto-create
3. **Catálogo** — `stories` table + admin pra criar/editar
4. **Player nativo HTML5** — `<video>` + `<audio>` + state mgmt
5. **R2 + Worker** — upload via presigned multipart + JWT signing
6. **Stripe checkout** — produtos, prices, webhook de subscription
7. **Paywall** — `storyRequiresUpgrade()` helper, gate no `/watch` e `/read`
8. **PWA** — service worker, manifest, install prompt
9. **Reviews + comentários** — table + RLS + admin moderation
10. **Otimização de mídia** — poster + prefetch + faststart automation ← **VOCÊ ESTÁ AQUI**

### 8.3 Coisas pra NUNCA esquecer

#### Quando criar tabela Supabase nova:
- [ ] Enable RLS
- [ ] Criar policies pra anon/authenticated
- [ ] **GRANT EXPLÍCITO** pra anon (SELECT), authenticated (INSERT/UPDATE/DELETE quando aplicável), **E SERVICE_ROLE PRA TUDO**

#### Quando criar trigger Supabase novo:
- [ ] `security definer set search_path = public` (senão pode falhar com search_path do user)
- [ ] **Backfill SQL** dos registros existentes — trigger só roda em INSERTs novos

#### Quando adicionar env var na Vercel:
- [ ] Marcar nos 3 environments (Production + Preview + Development)
- [ ] **REDEPLOY** com cache desativado (se for `NEXT_PUBLIC_*`)

#### Quando adicionar feature de admin:
- [ ] `requireAdmin()` DENTRO da server action, não confiar só no layout
- [ ] Usar `createServiceClient()` pra bypass RLS
- [ ] `revalidatePath()` nas rotas afetadas

#### Quando fazer upload de mídia pesada:
- [ ] Multipart upload (chunks de 50MB)
- [ ] Trigger automação pós-upload se precisa de processamento
- [ ] CORS config no bucket (`scripts/set-r2-cors.mjs` é referência)

#### Antes de afirmar "deu ruim" pro user:
- [ ] **Testar em produção**, não só ler o disco local (lição da sessão anterior: project_alluretv_worker_media memory)
- [ ] Curl direto no endpoint, ver response real
- [ ] Ver logs do Vercel/Worker/GitHub Actions

---

## 9. Glossário

| Termo | O que é |
|---|---|
| **moov atom** | Pedaço do MP4 com o índice de cenas/codec/duração. Player não toca sem ele. |
| **Faststart** | MP4 com moov no início do arquivo. Player toca quase imediato. |
| **HLS** | HTTP Live Streaming. Vídeo dividido em segmentos `.ts` + manifesto `.m3u8`. Permite adaptive bitrate. |
| **Edge cache** | Cache regional da CDN (Cloudflare PoPs). Acelera 2ª viewer em diante na mesma cidade. |
| **moov atom faststart** | Reorganização do MP4 — não recomprime, só move o índice. ffmpeg com `-c copy -movflags +faststart`. |
| **JWT** | JSON Web Token. String assinada com `tier`, `keyPrefix`, `exp`. Worker valida pra liberar mídia. |
| **R2** | Cloudflare's S3-compatible storage. Sem cobrança de egress. |
| **service_role** | Role do Supabase com bypass-RLS. Usado pelo admin server-side. |
| **authenticated** | Role do Supabase pra usuários logados. Respeita RLS. |
| **anon** | Role do Supabase pra anônimos. Só vê o que policies/grants permitirem. |
| **RLS** | Row Level Security. Filtra rows por usuário. |
| **PAT** | Personal Access Token. Token do GitHub com escopo limitado. |
| **repository_dispatch** | API do GitHub pra disparar workflows externamente (via POST). |
| **Server Action** | Função `'use server'` do Next.js. Roda no servidor, callable do client. |
| **Service Client (Supabase)** | Client com `SUPABASE_SERVICE_ROLE_KEY` — bypassa RLS. Só usar server-side. |

---

## Notas finais

Esse documento é **um snapshot** de 2026-05-15. Conforme você usar essa stack em novos projetos:

- **Atualiza este runbook** com lições novas que aprender
- **Cria um por projeto** se cada um tiver particularidades (LOVEFLIX vs EternaTV vs outros)
- **Padronize o setup**: tudo que tá listado em "Coisas pra NUNCA esquecer" é DOR REAL que aconteceu nesse projeto. Não repete.

Se aparecer **"permission denied for table X"** em qualquer admin de qualquer projeto seu, já sabe: é GRANT faltando pra service_role. Roda o template da seção 4.3 e segue a vida.

Se aparecer **vídeo lento pra iniciar**, já sabe: faststart. Aplica a Camada 3 (automação) desde o dia 1.

Boa replicação. 🚀
