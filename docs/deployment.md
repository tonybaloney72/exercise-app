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

Commit updated PNGs under `public/`.

**Verify:** Chrome DevTools → Application → Manifest; on iOS Safari → Share → **Add to Home Screen** and check icon + launch screen.

`src/app/icon.png` and `src/app/apple-icon.png` remain Next.js favicon / metadata fallbacks.
