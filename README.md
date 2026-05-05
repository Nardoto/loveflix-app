# AllureTV — Production App

Romance audiobook visual platform. **"Audiobook visual, not video streaming."**

Built for women 55+ in the US/DE/FR markets. Mobile-first, multilingual (EN/DE/FR/ES), background audio, casting, sleep timer.

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 16 + Tailwind 4 + shadcn/ui |
| Hosting | Vercel |
| Auth + DB + Storage | Supabase |
| Payments | Stripe Brazil (USD/EUR) |
| Video HLS | Bunny Stream |
| Player | Vidstack |
| Analytics | PostHog |
| Email | Resend |
| Push | OneSignal |
| i18n | next-intl |

---

## Sprint 0 — Setup checklist

### 1. Local dev environment
```bash
npm install
cp .env.example .env.local
# Fill in keys (see sections below)
npm run dev
# Open http://localhost:3000
```

The home page shows green/amber dots indicating which services are configured.

### 2. Create SaaS accounts (do these in parallel)

#### Supabase
1. Create account at https://app.supabase.com
2. Create new project named `alluretv-prod` (region close to US users — `us-east-1` recommended)
3. Wait ~2 min for provisioning
4. Open **SQL Editor** → New query → paste contents of `supabase/migrations/0001_init.sql` → Run
5. **Project Settings → API** → copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ server only)
6. **Authentication → Providers** → enable:
   - Google (OAuth client from Google Cloud)
   - Apple (Sign in with Apple — needs paid Apple Developer)
   - Email (magic link, no password)
7. **Storage** → create buckets: `covers` (public), `ebook-images` (public), `audios` (public)

#### Stripe (Brazil)
1. Create account at https://dashboard.stripe.com (Brazil, with CNPJ)
2. **Products** → Add product:
   - Name: `AllureTV Monthly`
   - Pricing: `$14.99 USD / month` recurring
   - Save and copy the `Price ID` (starts with `price_`) → `STRIPE_PRICE_ID_MONTHLY`
3. **Developers → API keys** → copy:
   - `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY`
4. **Developers → Webhooks** → Add endpoint:
   - URL: `https://YOUR-DOMAIN.com/api/stripe/webhook` (Sprint 3, leave for later)
   - Events: `customer.subscription.created`, `.updated`, `.deleted`, `invoice.payment_succeeded`, `.failed`
   - Copy `Signing secret` → `STRIPE_WEBHOOK_SECRET`
5. **Settings → Payment methods** → enable Apple Pay + Google Pay + Cards

#### Bunny Stream
1. Create account at https://bunny.net
2. **Stream** → Add Library → Name: `alluretv` → Region: closest to majority of users
3. Open the library:
   - **API → Library API Key** → `BUNNY_API_KEY`
   - **Library ID** (number at the top) → `BUNNY_LIBRARY_ID`
   - **Pull Zone hostname** (e.g. `alluretv.b-cdn.net`) → `BUNNY_PULL_ZONE`
4. **Pull Zone → Token Authentication** → enable → copy `Authentication Key` → `BUNNY_SECURITY_KEY`

#### PostHog
1. Create account at https://us.posthog.com (US instance — closest to user majority)
2. **Project Settings → Project API Key** → `NEXT_PUBLIC_POSTHOG_KEY`
3. Host stays `https://us.posthog.com`

#### Resend (email)
1. Create account at https://resend.com
2. **API Keys** → Create key → `RESEND_API_KEY`
3. (Later) Add custom domain when you have one

#### OneSignal (push)
1. Create account at https://onesignal.com
2. New App → Web → name: `AllureTV`
3. **Settings → Keys & IDs**:
   - `OneSignal App ID` → `NEXT_PUBLIC_ONESIGNAL_APP_ID`
   - `REST API Key` → `ONESIGNAL_REST_API_KEY`

### 3. Promote yourself to admin
After signing up the first time in the app, promote your profile to admin via Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```
Same for the second admin (creator).

### 4. Deploy to Vercel
```bash
# Push to GitHub first
git push origin main

# Then import the repo at https://vercel.com/new
# Add ALL env vars from .env.local in the Vercel dashboard
# Deploy
```

---

## Project structure

```
app/
  [locale]/              ← all routes are scoped to a locale (en/de/fr/es)
    layout.tsx
    page.tsx             ← Home (Sprint 0: status; Sprint 1: catalog)
    (marketing)/         ← landing for non-logged users (Sprint 1+)
    (app)/               ← logged-in app (Sprint 1+)
      s/[slug]/
      account/
    studio/              ← admin (Sprint 3)
  api/
    stripe/{checkout,webhook,portal}/
    bunny/upload-url/
components/
  ui/                    ← shadcn primitives
  player/                ← Vidstack player + custom controls
  catalog/               ← Hero, Row, Card
  ebook/                 ← E-book reader
  studio/                ← Admin forms
lib/
  supabase/{client,server,middleware}.ts
  stripe.ts
  bunny.ts
  posthog.ts
  i18n.ts
messages/
  en.json de.json fr.json es.json
supabase/
  migrations/0001_init.sql
```

---

## Roadmap

- **Sprint 0** (now) — Setup, schema, hello world ✅
- **Sprint 1** (1-2 weeks) — Auth + dynamic catalog
- **Sprint 2** (3-4 weeks) — Vidstack player + 4 audio languages + sleep timer + casting
- **Sprint 3** (5-6 weeks) — Stripe checkout + Customer Portal + Studio (creator uploads)
- **Sprint 4** (7-8 weeks) — Polish, ratings, push, beta launch with 50 testers from YouTube

---

## Reference

This repo is the production rebuild of an earlier visual prototype that validated the design and palette.
