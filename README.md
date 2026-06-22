# MyExercise

**https://myexercise.dev/**

Plan and log workouts in the browser, as an installed PWA, or in the **Android APK**. MyExercise builds a weekly plan from your equipment and preferences, then guides each session with timers, stretches, cardio logging, and progress charts. Sign in with Supabase to sync across devices, or use **Continue as guest** for local-only trial.

## Platforms

| Surface         | Install                                                                                 | Notes                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Web**         | Browser                                                                                 | Full app at myexercise.dev                                                                                 |
| **PWA**         | Add to Home Screen (iOS & Android)                                                      | Same UI as web; pull-to-refresh; no app store                                                              |
| **Android APK** | [Download](https://myexercise.dev/downloads/myexercise.apk) or Settings (installed PWA) | Capacitor shell → loads myexercise.dev; native Google OAuth, Health Connect, GPS tracking, pull-to-refresh |
| **iOS native**  | Not planned near-term                                                                   | iPhone uses PWA only                                                                                       |

## What it does

- **Today** — Today's workout, session logging (reps/timed sets), warm-up/cool-down, optional cardio, finish summary
- **Weekly** — Sun–Sat overview; preview, continue, or backfill any day
- **Library** — Exercise catalog; per-exercise defaults, favorites, dislikes
- **Progress** — Streaks, adherence, cardio mileage, pace/speed, daily steps & active kcal (Health Connect), charts, exercise history, calendar
- **Settings** — Equipment, program modes, week builder, timers, theme, default stretches, **Cardio & sensors** (Android APK)

**Android APK only:** Health Connect import (steps, active calories, heart rate, exercise sessions), Start/End cardio with **foreground GPS** distance tracking, mirror writes back to Health Connect. Web and guest mode use manual cardio entry and timers.

Plan changes apply to **today and upcoming days** in the current week; past days stay frozen for accurate history.

## Tech stack

### Web app

| Layer            | Packages                                        |
| ---------------- | ----------------------------------------------- |
| **Framework**    | Next.js 16, React 19, TypeScript                |
| **Styling**      | Tailwind CSS 4 (`@tailwindcss/postcss`)         |
| **State**        | Zustand                                         |
| **UI & motion**  | Framer Motion, Sonner (toasts), canvas-confetti |
| **Charts & DnD** | Recharts, @dnd-kit (sortable exercise lists)    |
| **IDs**          | uuid                                            |

### Backend & data

| Layer         | Packages                                                   |
| ------------- | ---------------------------------------------------------- |
| **Auth & DB** | Supabase (Auth, Postgres, RLS, Edge Functions)             |
| **Client**    | `@supabase/ssr`, `@supabase/supabase-js`                   |
| **Repos**     | `src/lib/repos/` — Supabase or `localStorage` by auth mode |

### Native (Android APK)

Capacitor 8 remote WebView shell (production site or bundled static export — see [docs/capacitor-android.md](docs/capacitor-android.md)).

| Capacitor plugin                                    | Purpose                                          |
| --------------------------------------------------- | ------------------------------------------------ |
| `@capacitor/geolocation`                            | GPS fallback when foreground service unavailable |
| `@capgo/capacitor-health`                           | Health Connect read (workouts, samples)          |
| `@capacitor/haptics`                                | Exercise complete feedback                       |
| `@capacitor/app`, `@capacitor/browser`              | Deep links, native Google OAuth                  |
| `@capacitor/splash-screen`, `@capacitor/status-bar` | Launch & system chrome                           |

**Custom Android (Java/Kotlin):**

| Component                   | Purpose                                                                   |
| --------------------------- | ------------------------------------------------------------------------- |
| `GpsTrackingService`        | Foreground service + Google Play Services fused location (screen-off GPS) |
| `GpsTrackingPlugin`         | Capacitor bridge for GPS start/stop/location events                       |
| `HealthExerciseWritePlugin` | Write exercise sessions to Health Connect                                 |

**App TypeScript:** `src/lib/health/` (Health Connect, cardio resolver, daily metrics), `src/lib/geo/` (GPS session, haversine distance).

### Dev, test & deploy

| Tool                          | Purpose                                               |
| ----------------------------- | ----------------------------------------------------- |
| Vitest                        | Unit tests                                            |
| ESLint (`eslint-config-next`) | Lint                                                  |
| Prettier                      | Format                                                |
| Fallow                        | Dead-code / complexity audit (`npm run fallow:audit`) |
| Supabase CLI                  | Migrations (`npm run db:push`)                        |
| Sharp                         | PWA + Android icon generation                         |
| `@next/bundle-analyzer`       | `npm run analyze`                                     |
| Vercel                        | Web + PWA deploy                                      |

## Getting started

### Prerequisites

- Node.js 20+
- npm
- Supabase project (optional for guest-only local dev)
- Android Studio + JDK 17+ (optional — only for APK builds/emulator)

### Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

(Supabase dashboard may still label this the anon key.)

See [docs/deployment.md](docs/deployment.md) and [docs/supabase-migrations.md](docs/supabase-migrations.md).

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Common scripts

| Command                      | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `npm run dev`                | Dev server (`0.0.0.0` for Android emulator)          |
| `npm run build` / `start`    | Production build / local prod                        |
| `npm run test`               | Vitest (single run)                                  |
| `npm run test:watch`         | Vitest watch mode                                    |
| `npm run lint`               | ESLint                                               |
| `npm run icons`              | Regenerate PWA icons                                 |
| `npm run fallow:audit`       | Dead-code audit vs `main` + worktree prune           |
| `npm run db:push`            | Apply Supabase migrations to linked project          |
| `npm run analyze`            | Production bundle analysis                           |
| `npm run build:capacitor`    | Static export for bundled APK (`out/`)               |
| `npm run android:remote:run` | Emulator → production site in APK shell              |
| `npm run android:dev`        | Emulator → local dev (needs `npm run dev`)           |
| `npm run android:apk`        | Build remote APK → `public/downloads/myexercise.apk` |
| `npm run android:icons`      | Regenerate launcher + splash from brand PNG          |

Android details: [docs/capacitor-android.md](docs/capacitor-android.md).

## Data flow (short)

- **Signed-in** — `src/lib/repos/` → Supabase (RLS per user)
- **Guest** — `localStorage` repos; optional migration on first login
- **Plans** — Generator + catalog (`src/core/`, `src/lib/planGenerator.ts`) or custom week
- **Cardio (APK)** — GPS track → `gps_track_points` + `actual_distance_mi`; Health Connect enrich via `src/lib/health/resolveCardioQuickLog.ts`

Guest vs account: [docs/guest-vs-account.md](docs/guest-vs-account.md).

## Project layout

```
src/
  app/           # Next.js routes
  components/    # UI by feature
  core/          # Catalog, types, framework-agnostic rules
  lib/
    health/      # Health Connect, cardio resolver, daily metrics
    geo/         # GPS tracking session, distance math
    repos/       # Supabase + localStorage data access
  stores/        # Zustand
android/         # Capacitor Android project + native GPS/HC plugins
docs/            # Deployment, Android, catalog, Supabase, cardio
supabase/        # SQL migrations + Edge Functions
public/          # PWA assets, downloads/myexercise.apk
```

## Docs

| Doc                                                   | Topic                                       |
| ----------------------------------------------------- | ------------------------------------------- |
| [deployment.md](docs/deployment.md)                   | Vercel env, version checks, feedback digest |
| [capacitor-android.md](docs/capacitor-android.md)     | APK build, OAuth deep link, emulator dev    |
| [cardio-tracking.md](docs/cardio-tracking.md)         | Health Connect + GPS engineering notes      |
| [supabase-migrations.md](docs/supabase-migrations.md) | Database schema                             |
| [guest-vs-account.md](docs/guest-vs-account.md)       | Guest cookie vs signed-in sync              |
| [catalog-maintenance.md](docs/catalog-maintenance.md) | Exercise catalog tooling                    |
| [week-plan-regen.md](docs/week-plan-regen.md)         | When generated week plans refresh           |

## Deploy

Deploy to Vercel with env vars above. Configure Supabase auth redirect URLs for production and `dev.myexercise.app://auth/callback` for native Google OAuth. After native or manifest changes, run `npm run android:apk` and redeploy so `/downloads/myexercise.apk` stays current.

## License

Private project. All rights reserved unless otherwise noted.
