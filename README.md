# MyExercise App

https://myexercise.dev/

A Progressive Web App (PWA) for planning and logging workouts. Use it in the browser or add it to your home screen on iOS and Android for an app-like experience. MyExercise builds a weekly training plan from your equipment, priorities, and preferences, then guides you through each session with timers, stretch blocks, cardio logging, and progress charts. Sign in with Supabase to sync across devices, or use **Continue as guest** to try it locally without an account.

## What it does

- **Today** - See today's prescribed workout, start or resume a session, log sets (reps or timed), warm-up and cool-down stretches, and optional jog/cardio. Finish with a summary and notes.
- **Weekly** - Sun through Sat overview of the current calendar week. Open any day to preview the plan, review a completed workout, continue an unfinished session, or backfill a missed day.
- **Library** - Browse the exercise catalog (strength, core, cardio, warm-up, cool-down). Set per-exercise defaults (reps vs timer, targets), favorites, and dislikes that influence plan generation.
- **Progress** - Streaks, planned vs completed adherence, cardio mileage, Recharts trends, per-exercise history, and a workout calendar.
- **Settings** - Equipment onboarding, training priorities or weekly layout modes, custom week builder, rest timers, sounds, vibration, dark mode, and default stretch lists.

### Program modes

| Mode              | What you control                                                      | How the week is built                                             |
| ----------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Priorities**    | Preset or custom 0-4 emphasis on core, cardio, lower body, push, pull | Catalog-themed days; generator fills rounds biased by your scores |
| **Weekly layout** | Which emphasis groups appear on each weekday (0 = rest)               | Exercises only from allowed groups per day                        |
| **Custom week**   | Wizard, per-day editor, day templates                                 | You own the week; stored as a custom plan                         |

Plan changes generally apply to **today and upcoming days** in the current week; past days stay frozen so history stays accurate.

## Tech stack

| Layer       | Technology                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework   | [Next.js](https://nextjs.org/) 16 (App Router, React Server Components where applicable)                                                                      |
| UI          | [React](https://react.dev/) 19, [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/) 4                                     |
| State       | [Zustand](https://zustand.docs.pmnd.rs/)                                                                                                                      |
| Motion / UX | [Framer Motion](https://www.framer.com/motion/), [@dnd-kit](https://dndkit.com/) (drag-and-drop in editors), [Sonner](https://sonner.emilkowal.ski/) (toasts) |
| Charts      | [Recharts](https://recharts.org/)                                                                                                                             |
| Backend     | [Supabase](https://supabase.com/) (Auth, Postgres, Row Level Security) via `@supabase/supabase-js` and `@supabase/ssr`                                        |
| Deploy      | [Vercel](https://vercel.com/) (typical); PWA assets in `public/`                                                                                              |
| Tests       | [Vitest](https://vitest.dev/) (unit tests under `src/lib/`, etc.)                                                                                             |

Other notable pieces: **Web Audio API** for timer chimes, **Vibration API** for haptics, **canvas-confetti** on workout complete, and **uuid** for client-generated ids in guest mode.

## How data flows

- **Authenticated users** - Workouts and settings persist through a repository layer (`src/lib/repos/`) that talks to Supabase. RLS limits each user to their own rows (`profiles`, `user_settings`, `workout_logs`, `exercise_logs`, preferences, training weeks).
- **Guests** - Same UI with `localStorage`-backed repos; no Supabase calls until you create an account (optional migration on first login).
- **Plans** - Training weeks are materialized from a catalog plus generator (`src/lib/planGenerator.ts`, `planResolver.ts`) or saved as a custom week. Stretch lists are derived from settings and day focus (`src/lib/dayStretchPlan.ts`).

## Getting started

### Prerequisites

- Node.js 20+
- npm
- A Supabase project (only required for sign-in and sync; guest mode works without it for local dev if guest API is enabled)

### Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

See [docs/deployment.md](docs/deployment.md) and [docs/supabase-migrations.md](docs/supabase-migrations.md) for production setup and schema migrations.

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Sign up** / **Log in**, or **Continue as guest** to jump to Today.

### Useful scripts

| Command                          | Purpose                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`                    | Development server                                                            |
| `npm run build`                  | Production build                                                              |
| `npm run start`                  | Run production build locally                                                  |
| `npm run lint`                   | ESLint                                                                        |
| `npm run test`                   | Vitest (single run)                                                           |
| `npm run test:watch`             | Vitest watch mode                                                             |
| `npm run fallow:audit`           | Optional Fallow audit vs `main`; prunes Fallow temp worktrees after           |
| `npm run audit:catalog`          | Inventory / QA pass on the exercise catalog                                   |
| `npm run generate:category-index`| **After catalog id/category edits** — regenerates `exerciseCategoryIndex.ts` (see [docs/catalog-maintenance.md](docs/catalog-maintenance.md)) |
| `npm run catalog:enrich`         | Automated catalog metadata enrichment                                         |
| `npm run icons`                  | Regenerate PWA icons from brand assets                                        |

### Fallow and git worktrees

`fallow audit` (default `new-only` gate) keeps a reusable checkout of `main` under `%TEMP%/fallow-audit-base-cache-*` so it can tell new vs inherited findings. That shows up in the IDE as an extra worktree, not a real branch. `npm run fallow:audit` runs `git worktree prune` afterward so it usually disappears; if a run was interrupted, use `npm run fallow:prune-worktrees`. To skip the base snapshot entirely (no extra worktree, but no introduced/inherited split), use `fallow audit --base main --gate all`.

## Project layout (high level)

```
src/
  app/              # Next.js routes (auth, today, weekly, library, progress, settings)
  components/       # UI by feature (workout, progress, settings, common)
  data/             # Exercise catalog, categories, training week catalog
  hooks/            # Plan loading, resolved stretches, etc.
  lib/              # Plan generator, repos, stretch logic, cardio, history
  stores/           # Zustand (workout session, settings, auth, preferences)
supabase/           # SQL migrations
docs/               # Deployment, migrations, guest vs account, catalog maintenance
```

## Deploy

The app is designed to deploy on Vercel with the environment variables above. After deploy, verify PWA install icons and Supabase auth redirect URLs for your production domain. Details: [docs/deployment.md](docs/deployment.md).

## License

Private project. All rights reserved unless otherwise noted in the repository.
