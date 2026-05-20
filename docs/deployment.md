# Deployment (Vercel)

## Environment variables

Set in the Vercel project (Production + Preview):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Match your Supabase project. See [supabase-migrations.md](./supabase-migrations.md) before relying on new DB features.

## Custom domain (optional)

1. Vercel project → **Settings** → **Domains**
2. Add your domain (e.g. `app.example.com`)
3. At your DNS host, add the records Vercel shows (usually `CNAME` to `cname.vercel-dns.com`, or `A` for apex)
4. Wait for **Valid Configuration**; SSL is automatic
5. Optional: set the custom domain as **Primary** so redirects consolidate to one URL

No code changes are required in the repo for a custom domain.

## PWA / Add to Home Screen

Icons and manifest live in `public/`:

| Asset | Purpose |
|-------|---------|
| `manifest.json` | Install metadata (192 / 512 icons) |
| `icon-192.png`, `icon-512.png` | Android / Chromium install |
| `apple-touch-icon.png` | iOS home screen icon |
| `apple-splash-1170x2532.png` | iOS startup splash (common portrait size) |

Regenerate from the brand logo after a rebrand:

```bash
npm install
npm run icons
```

Commit **all** of these after `npm run icons` (if they are not in git, production still shows the default Next/Vercel “V” on Add to Home Screen):

- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/apple-splash-1170x2532.png`
- `src/app/icon.png`, `src/app/apple-icon.png` (Next.js `/icon` route — Android often uses this when manifest icons are missing)

**Verify (Android):** deploy → Chrome → `https://your-domain/icon-192.png` should show your logo, not 404. DevTools → **Application** → **Manifest** → Icons. Then remove the old shortcut and **Install app** / **Add to Home screen** again (Android caches the old icon).

**Verify (iOS):** Safari → Share → **Add to Home Screen** (splash + `apple-touch-icon`).
