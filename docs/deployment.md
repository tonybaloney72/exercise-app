# Deployment (Vercel)

## Environment variables

Set in the Vercel project (Production + Preview):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Match your Supabase project. See [supabase-migrations.md](./supabase-migrations.md) before relying on new DB features.

### App version checks (Phase 1)

Production builds automatically set `NEXT_PUBLIC_BUILD_ID` from `VERCEL_GIT_COMMIT_SHA` (via `next.config.ts`). The client compares that id to `GET /api/version` on load, tab focus, and hourly while active.

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `VERCEL_GIT_COMMIT_SHA` | Auto on Vercel | Current deploy build id (server + client) |
| `NEXT_PUBLIC_BUILD_ID` | Optional override | Manual build id when not on Vercel |
| `APP_FORCE_UPDATE` | Optional | Set to `true` for a breaking release → blocking refresh modal |
| `APP_UPDATE_MESSAGE` | Optional | Custom copy for the update banner/modal |

**Breaking release:** deploy the new build, then set `APP_FORCE_UPDATE=true` on Vercel until stale tabs refresh. Clear the flag on the next routine deploy if only a soft banner is needed.

**Local dev:** build id defaults to `development`; client and `/api/version` match, so no banner appears.

### User feedback digest (Supabase Edge Function)

Set on the **Supabase project** (not Vercel) for `feedback-digest`:

| Secret | Purpose |
| ------ | ------- |
| `RESEND_API_KEY` | Resend API key for digest emails |
| `ADMIN_REPORT_EMAIL` | Inbox that receives batched exercise reports |
| `FEEDBACK_FROM_EMAIL` | Verified Resend sender (defaults to `feedback@resend.dev` in dev) |
| `CRON_SECRET` | Optional bearer token for scheduled invocations |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.

**Schedule:** In Supabase Dashboard → Edge Functions → `feedback-digest` → add a daily cron (or use `pg_cron` + `net.http_post`). The function POSTs to itself with `Authorization: Bearer <CRON_SECRET>` when configured.

Apply migration `20260529120000_user_feedback.sql` before enabling the digest.

## Custom domain (optional)

1. Vercel project → **Settings** → **Domains**
2. Add your domain (e.g. `app.example.com`)
3. At your DNS host, add the records Vercel shows (usually `CNAME` to `cname.vercel-dns.com`, or `A` for apex)
4. Wait for **Valid Configuration**; SSL is automatic
5. Optional: set the custom domain as **Primary** so redirects consolidate to one URL

No code changes are required in the repo for a custom domain.

## PWA / Add to Home Screen

Icons and manifest live in `public/`:

| Asset                          | Purpose                                   |
| ------------------------------ | ----------------------------------------- |
| `manifest.json`                | Install metadata (192 / 512 icons)        |
| `icon-192.png`, `icon-512.png` | Android / Chromium install                |
| `apple-touch-icon.png`         | iOS home screen icon                      |
| `apple-splash-1170x2532.png`   | iOS startup splash (common portrait size) |

Regenerate from the brand logo after a rebrand:

```bash
npm install
npm run icons
```

Commit **all** of these after `npm run icons` (if they are not in git, production still shows the default Next/Vercel “V” on Add to Home Screen):

- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/apple-splash-1170x2532.png`
- `src/app/icon.png`, `src/app/apple-icon.png` (Next.js `/icon` route - Android often uses this when manifest icons are missing)

**Verify (Android):** deploy → Chrome → `https://your-domain/icon-192.png` should show your logo, not 404. DevTools → **Application** → **Manifest** → Icons. Then remove the old shortcut and **Install app** / **Add to Home screen** again (Android caches the old icon).

**Verify (iOS):** Safari → Share → **Add to Home Screen** (splash + `apple-touch-icon`).

## Nutrition (FatSecret)

Server-only env (Vercel + local `.env.local`):

| Variable | Purpose |
| -------- | ------- |
| `FATSECRET_OAUTH_ONE_KEY` / `FATSECRET_OAUTH_ONE_SECRET` | Platform OAuth 1.0 (search, food detail, diary writes) |
| `FATSECRET_PROFILE_ENCRYPTION_KEY` | Encrypt per-user FatSecret tokens in Supabase |

Apply migration `20260708120000_nutrition_fatsecret_profiles.sql` before diary sync.

**Barcode scanning (planned):** Premier barcode API + device camera — see [nutrition-barcode-scanning.md](./nutrition-barcode-scanning.md).
