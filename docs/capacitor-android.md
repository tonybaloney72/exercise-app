# Capacitor Android

MyExercise on Android uses **Capacitor** with the same React/Next UI. Two load modes:

| Mode        | How                                     | When                                                            |
| ----------- | --------------------------------------- | --------------------------------------------------------------- |
| **Remote**  | WebView → `https://myexercise.dev`      | Fastest to ship; sideload APK while iterating                   |
| **Bundled** | Static export in `out/` copied into APK | Offline-capable UI; `/api/*` still hits production until ported |

## Platform scope (May 2026)

**Android Capacitor + Health Connect first.** Web/PWA on all platforms. **iPhone: PWA only** - no App Store or HealthKit in the near term. React/Next UI is unchanged; native code is a thin shell only. iOS native and other deferred ideas → [ROADMAP - Ideas](../ROADMAP.md#ideas--future-considerations).

Health Connect + GPS code → `src/lib/health/`, `src/lib/geo/`. Backlog → [ROADMAP.md](../ROADMAP.md).

## Prerequisites

- [Android Studio](https://developer.android.com/studio) (SDK + emulator or USB device)
- **JDK 17+** - bundled with Android Studio (`jbr`). `npm run android:*` scripts auto-set `JAVA_HOME` to Studio’s JBR on Windows/macOS when it is not already set.
- Node 20+

### Optional: set JAVA_HOME permanently (Windows)

If you run Gradle from Android Studio only, you can skip this. For CLI builds (`npm run android:dev`), either use the npm scripts (auto-detect) or in **System environment variables**:

| Variable    | Example value                                 |
| ----------- | --------------------------------------------- |
| `JAVA_HOME` | `C:\Program Files\Android\Android Studio\jbr` |

Add `%JAVA_HOME%\bin` to `Path`, then open a **new** terminal.

## Two ways to run the Android app

| Goal                            | What to run                                                   | WebView loads                            |
| ------------------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| **Production** (myexercise.dev) | `npm run android:remote:run`                                  | `https://myexercise.dev`                 |
| **Local dev** (your machine)    | Terminal 1: `npm run dev` · Terminal 2: `npm run android:dev` | `http://10.0.2.2:3000` (emulator → host) |

`npm run android:remote` only **syncs** config into the Android project - it does **not** start the emulator. Use `android:remote:run` to sync **and** launch.

### Production (recommended first test)

```bash
npm run android:remote:run
```

Wait for Gradle + deploy to the emulator. You should see the full landing page (Log in, Create account, Continue as guest) loading **live production**.

To open Android Studio instead of auto-run:

```bash
npm run android:remote
npm run cap:open:android
```

Then click **Run ▶** in Studio.

### Local dev vs production remote

|                     | **`android:dev`**                               | **`android:remote:run`**                    |
| ------------------- | ----------------------------------------------- | ------------------------------------------- |
| **Tests your code** | Yes - serves from `npm run dev` on your machine | **No** - loads **deployed** myexercise.dev  |
| **Needs**           | `npm run dev` running in another terminal       | Internet only                               |
| **Use when**        | Developing Capacitor + landing/auth fixes       | Smoke-testing the live site in an APK shell |

To test **your uncommitted changes** on Android, always use **`android:dev`**, not remote.

### Android launcher icon vs splash screens

Regenerate from `public/branding/ME_Logo_Simple.png` after logo changes:

```bash
npm run android:icons
npm run android:dev   # or cap sync + rebuild
```

| Asset                           | Role                                                                                        | Location                             |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| **`ic_launcher` / `mipmap-*`**  | Home-screen **app icon**                                                                    | `android/app/src/main/res/mipmap-*`  |
| **`splash.png` (many folders)** | **Launch screen** while the WebView loads - one PNG per screen density + portrait/landscape | `android/app/src/main/res/drawable*` |

Both use the MyExercise logo on `#0f1117` (same as the web app theme).

### If `/api/version` 404 on localhost

A failed `npm run build:capacitor` can leave `src/app/api` and `src/proxy.ts` in `.capacitor-backup/` (removed from the tree). Symptom: version check 404, guest/sign-out API broken.

```bash
node scripts/capacitor-restore.mjs
```

Restart `npm run dev`. Never run `build:capacitor` until dynamic-route export is fixed (see below).

### Local dev

**Both** must be running:

```bash
# Terminal 1 - keep this open
npm run dev

# Terminal 2
npm run android:dev
```

If Terminal 1 is not running, the emulator shows a connection error or blank page.

### Buttons dead on login / landing (android:dev)

The emulator loads your dev server as **`http://10.0.2.2:3000`**, not `localhost`. Next.js dev blocks `/_next/*` scripts from unknown hostnames by default, so the page can **look** fine but **JavaScript never loads** - taps do nothing.

This repo sets `allowedDevOrigins` in `next.config.ts` (includes `10.0.2.2`). **Restart `npm run dev`** after pulling that change - if you still see `Blocked cross-origin request ... from "10.0.2.2"` in the terminal, the config did not load (login forms will submit as plain GET and nothing interactive will work).

For a **physical device** on Wi‑Fi, set your PC IP before sync:

```bash
CAPACITOR_SERVER_URL=http://192.168.x.x:3000 npm run android:dev
# optional extra hostnames for next dev:
CAPACITOR_DEV_HOSTS=192.168.x.x npm run dev
```

### Debug the WebView (see console errors on your PC)

Debug builds enable Chrome remote debugging. With the emulator running:

1. Open Chrome on your desktop → `chrome://inspect`
2. Under **Remote Target**, find your app WebView → **inspect**

You can also watch the **`npm run dev` terminal** - blocked dev origins log a warning with the hostname to allow.

### Pull to refresh

Android APK and **installed PWA** (standalone) do not get the browser’s native pull-to-refresh. In the app shell, pull down at the top of any tab to reload settings, workout history, and the current training week. Regular mobile browser tabs are unchanged (they keep the browser gesture).

### Google OAuth in the APK

Web Google sign-in uses `/auth/callback` on the server. In the native shell, OAuth opens the system browser and returns via a deep link so the PKCE exchange runs in the WebView.

**Supabase Dashboard** → Authentication → URL Configuration → **Redirect URLs**, add:

```text
dev.myexercise.app://auth/callback
```

Flow: `signInWithOAuth` (`skipBrowserRedirect`) → Capacitor Browser → Google → deep link → `NativeOAuthSync` → `exchangeCodeForSession` → app route.

After changing `AndroidManifest.xml` or adding `@capacitor/browser`, rebuild the APK:

```bash
npm run android:apk
```

Physical device on same Wi‑Fi: set `CAPACITOR_SERVER_URL=http://YOUR_PC_IP:3000` before sync (see below).

On Windows, use the npm scripts above (they set env vars via Node - do not rely on `VAR=value` in cmd).

Clear remote URL for bundled sync:

```bash
unset CAPACITOR_SERVER_URL   # bash
npm run build:capacitor
npm run cap:sync
```

## Bundled assets

```bash
npm run build:capacitor   # static export → out/
npm run cap:sync
npm run cap:open:android
```

The export script (`scripts/capacitor-export-build.mjs`):

- Swaps in client-only `(app)/layout.tsx` (no Supabase server layout)
- Temporarily removes Next **API routes** and **auth callback** (not available in static export)
- Sets `NEXT_PUBLIC_API_ORIGIN=https://myexercise.dev` so guest/sign-out/version calls reach production

Guest mode in bundled builds sets the guest cookie **client-side** (`guestCookieClient.ts`).

### Bundled export - remaining work

Dynamic App Router segments (`/weekly/day/[date]`, `/progress/history/[date]`, …) still need `generateStaticParams` or a client routing pass before export is fully green. Until then, use **remote** mode for day-to-day Android testing.

## Environment variables

| Variable                                    | Purpose                                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `CAPACITOR_SERVER_URL`                      | When set, WebView loads this URL instead of `out/`                                  |
| `CAPACITOR_BUILD=1`                         | Set by export script; enables `output: 'export'` in `next.config.ts`                |
| `NEXT_PUBLIC_API_ORIGIN`                    | Production origin for `/api/*` in bundled builds (default `https://myexercise.dev`) |
| `NATIVE_BUILD` / `NEXT_PUBLIC_NATIVE_BUILD` | APK build id for future update channel                                              |
| `NEXT_PUBLIC_ANDROID_APP_DOWNLOAD_URL`      | Optional override for APK URL (default `/downloads/myexercise.apk` in `public/`)    |

## Publish a downloadable APK

Build the remote shell APK and copy it into `public/` so Vercel serves it at `/downloads/myexercise.apk`:

```bash
npm run android:apk
```

Then commit `public/downloads/myexercise.apk` and deploy. Settings (installed Android PWA) and `/download/android` link to that file.

Override the URL with `NEXT_PUBLIC_ANDROID_APP_DOWNLOAD_URL` if you host the APK elsewhere (e.g. GitHub Releases).

**Note:** `android:apk` produces a **debug** build for sideloading. For wider distribution, sign a release APK (`assembleRelease` + keystore) and replace the file before publishing.

## App id

`dev.myexercise.app` - change in `capacitor.config.ts` before Play Store release.

## Icons

PWA icons live in `public/`. Replace Android launcher icons under `android/app/src/main/res/mipmap-*` or use [@capacitor/assets](https://github.com/ionic-team/capacitor-assets) in a follow-up.

## Related

- [deployment.md](./deployment.md) - Vercel + PWA
- ROADMAP → **Native app (Capacitor - Android)**
