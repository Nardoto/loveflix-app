# AllureTV media playback Worker

Cloudflare Worker that gates access to the `alluretv-media` R2 bucket. The Next.js app (issuer) signs short-lived JWTs; this Worker (verifier) validates them and streams R2 objects with Range support.

## Setup

```powershell
cd worker-media
npm install

# 1) Log in to Cloudflare
npx wrangler login

# 2) Set the shared JWT secret (must match JWT_MEDIA_SECRET in the Next.js .env)
npx wrangler secret put JWT_MEDIA_SECRET

# 3) Deploy
npx wrangler deploy

# 4) Attach a custom domain (one-time, in the Cloudflare dashboard):
#    Workers & Pages → alluretv-worker-media → Settings → Domains & Routes → Add Custom Domain
#    → media.alluretv.net
```

## Free prefixes

By default every request requires a valid JWT with `tier ∈ { active, trialing }`. To make a path public (e.g. covers, free Book 1), set `FREE_PREFIXES` in `wrangler.toml`:

```toml
[vars]
FREE_PREFIXES = "stories/he-had-never-touched-me/book1/,covers/"
```

Free-prefixed objects bypass the JWT check entirely and ship with `Cache-Control: public, max-age=86400`.

## Local dev

```powershell
npx wrangler dev
```

Test:

```powershell
curl http://localhost:8787/stories/foo/book1/video.mp4?token=$TOKEN -i
```
