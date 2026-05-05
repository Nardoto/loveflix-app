# AllureTV — Cloudflare R2 + Worker setup

End-to-end checklist for going from "domain at Cloudflare" to "Studio uploads working and Player streams from R2."

## 1. Cloudflare R2 bucket

1. Cloudflare dashboard → **R2** → **Create bucket** → name: `alluretv-media`, region: `Automatic`, public access: **disabled**.
2. **Manage R2 API Tokens** → **Create API token**:
   - Permissions: `Object Read & Write`
   - Specific bucket: `alluretv-media`
   - TTL: forever (rotate annually)
3. Save the values (you only see the secret once):
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`
   - Account ID (top-right of R2 dashboard) → `R2_ACCOUNT_ID`

## 2. Shared JWT secret

Generate a 32-byte secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Use the **same value** in two places:
- `.env.local` (app root) → `JWT_MEDIA_SECRET=...`
- Worker secret: `cd worker-media; npx wrangler secret put JWT_MEDIA_SECRET`

## 3. Deploy the playback Worker

```powershell
cd worker-media
npm install
npx wrangler login
npx wrangler secret put JWT_MEDIA_SECRET    # paste the same secret as above
npx wrangler deploy
```

Then in the Cloudflare dashboard → **Workers & Pages** → `alluretv-worker-media` → **Settings** → **Domains & Routes** → **Add Custom Domain** → `media.alluretv.net`.

> The R2 bucket binding is already declared in `wrangler.toml`. The Worker is the **only** way the bucket is exposed — never enable the public `r2.dev` URL.

## 4. Configure Next.js

Copy `.env.example` to `.env.local` and fill in:

```env
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="alluretv-media"
R2_PUBLIC_DOMAIN="media.alluretv.net"
NEXT_PUBLIC_MEDIA_DOMAIN="media.alluretv.net"
JWT_MEDIA_SECRET="..."           # same as Worker secret
ADMIN_EMAILS="rededecanaisanonimo@gmail.com"
```

Install the new deps and run:

```powershell
npm install
npm run dev
```

## 5. Use the Studio

1. Sign in to Supabase as one of the addresses listed in `ADMIN_EMAILS`.
2. Visit `/studio` → click **New Story**.
3. Fill **Story slug** (must match a row in the catalog — e.g. `he-had-never-touched-me`) and **Book #**.
4. Pick the cover, the video, and any of the 4 audio tracks (EN/DE/FR/ES).
5. Click **Start upload**. Files are chunked into 50 MB parts and PUT directly to R2.

Files land at:

```
stories/<slug>/book<N>/cover.jpg
stories/<slug>/book<N>/video.mp4
stories/<slug>/book<N>/audio-en.mp3
stories/<slug>/book<N>/audio-de.mp3
stories/<slug>/book<N>/audio-fr.mp3
stories/<slug>/book<N>/audio-es.mp3
```

## 6. Wire a story to R2 keys

In `lib/data/stories.ts`, add `videoKey` and `audioKeyByLocale` to the story you uploaded:

```ts
{
  slug: 'he-had-never-touched-me',
  // ... existing fields
  videoKey: 'stories/he-had-never-touched-me/book1/video.mp4',
  audioKeyByLocale: {
    en: 'stories/he-had-never-touched-me/book1/audio-en.mp3',
    de: 'stories/he-had-never-touched-me/book1/audio-de.mp3',
    fr: 'stories/he-had-never-touched-me/book1/audio-fr.mp3',
    es: 'stories/he-had-never-touched-me/book1/audio-es.mp3',
  },
}
```

The Player auto-detects keys and routes through `media.alluretv.net/<key>?token=<jwt>`. Legacy `videoSrc` / `audioByLocale` URLs still work for any story not yet migrated to R2.

## 7. Costs at a glance

50 stories × 3 books × ~500 MB ≈ 75 GB:

| Item | Monthly |
|---|---|
| R2 storage | ~US$ 1.13 |
| R2 egress (Class B) | **US$ 0** |
| Worker requests (≤ 3M) | **US$ 0** |
| **Total** | **~US$ 1-3** |

## 8. Troubleshooting

- **`NEXT_PUBLIC_MEDIA_DOMAIN not set`** in the browser console → `.env.local` is missing or dev server wasn't restarted.
- **Worker returns 401 "Invalid token"** → the secret in `wrangler secret put` doesn't match `JWT_MEDIA_SECRET` in `.env.local`. Re-run `wrangler secret put` and redeploy.
- **Worker returns 402 "Subscription required"** → the user's Supabase `subscriptions.status` is not `active`/`trialing`. Add a row or temporarily widen `FREE_PREFIXES` in `wrangler.toml`.
- **Upload stalls at 100%** → check the browser network tab for a failed `POST /api/upload/complete`. R2 sometimes needs ~5 s after the last part to acknowledge. Retry by reopening the Studio dialog.
- **Video buffers but won't play** → confirm `Accept-Ranges: bytes` in the response (browser dev tools). If missing, the Worker isn't deployed correctly.
